import _ from 'lodash'
import { serializeError } from 'serialize-error'
import VError from 'verror'
import { validateHmacSignature } from '../../utils/hmacValidator.js'
import utils from '../../utils/commons.js'
import ctp from '../../utils/ctp.js'
import config from '../../config/config.js'
import { getLogger } from '../../utils/logger.js'

const mainLogger = getLogger()

async function processNotification(
  notification,
  enableHmacSignature,
  ctpProjectConfig,
) {
  const logger = mainLogger.child({
    commercetools_project_key: ctpProjectConfig.projectKey,
  })

  if (enableHmacSignature) {
    const errorMessage = validateHmacSignature(notification)
    if (errorMessage) {
      logger.error(
        { notification: utils.getNotificationForTracking(notification) },
        `HMAC validation failed. Reason: "${errorMessage}"`,
      )
      return
    }
  }

  const merchantReference = _.get(
    notification,
    'NotificationRequestItem.merchantReference',
    null,
  )

  const pspReference = _.get(
    notification,
    'NotificationRequestItem.pspReference',
    null,
  )

  const originalReference = _.get(
    notification,
    'NotificationRequestItem.originalReference',
    null,
  )

  const ctpClient = await ctp.get(ctpProjectConfig)

  const payment = await getPaymentByMerchantReference(
    merchantReference,
    originalReference || pspReference,
    ctpClient,
  )

  if (
    !payment.custom.fields.makePaymentResponse &&
    !payment.custom.fields.createSessionResponse
  ) {
    const error = new Error(`Payment ${merchantReference} is not created yet.`)
    error.statusCode = 503

    throw new VError(error, `Payment ${merchantReference} is not created yet.`)
  }

  if (payment)
    await updatePaymentWithRepeater(payment, notification, ctpClient, logger)
  else
    logger.error(
      `Payment with merchantReference: ${merchantReference} was not found`,
    )
}

async function updatePaymentWithRepeater(
  payment,
  notification,
  ctpClient,
  logger,
) {
  const maxRetry = 20
  let currentPayment = payment
  let currentVersion = payment.version
  let retryCount = 0
  let retryMessage
  let updateActions
  while (true) {
    updateActions = await calculateUpdateActionsForPayment(
      currentPayment,
      notification,
      logger,
    )
    if (updateActions.length === 0) {
      break
    }
    logger.debug(
      `Update payment with key ${
        currentPayment.key
      } with update actions [${JSON.stringify(updateActions)}]`,
    )
    try {
      /* eslint-disable-next-line no-await-in-loop */
      await ctpClient.update(
        ctpClient.builder.payments,
        currentPayment.id,
        currentVersion,
        updateActions,
      )
      logger.debug(
        `Payment with key ${currentPayment.key} was successfully updated`,
      )
      break
    } catch (err) {
      const moduleConfig = config.getModuleConfig()
      let updateActionsToLog = updateActions
      if (moduleConfig.removeSensitiveData)
        updateActionsToLog =
          _obfuscateNotificationInfoFromActionFields(updateActions)

      if (err.statusCode !== 409) {
        const errMsg =
          `Unexpected error on payment update with ID: ${currentPayment.id}.` +
          `Failed actions: ${JSON.stringify(updateActionsToLog)}`
        throw new VError(err, errMsg)
      }

      retryCount += 1
      if (retryCount > maxRetry) {
        retryMessage =
          'Got a concurrent modification error' +
          ` when updating payment with id "${currentPayment.id}".` +
          ` Version tried "${currentVersion}",` +
          ` currentVersion: "${err.body.errors[0].currentVersion}".`
        throw new VError(
          err,
          `${retryMessage} Won't retry again` +
            ` because of a reached limit ${maxRetry}` +
            ` max retries. Failed actions: ${JSON.stringify(
              updateActionsToLog,
            )}`,
        )
      }
      /* eslint-disable-next-line no-await-in-loop */
      const response = await ctpClient.fetchById(
        ctpClient.builder.payments,
        currentPayment.id,
      )
      currentPayment = response.body // eslint-disable-line prefer-destructuring
      currentVersion = currentPayment.version
    }
  }
}

function _obfuscateNotificationInfoFromActionFields(updateActions) {
  const copyOfUpdateActions = _.cloneDeep(updateActions)
  copyOfUpdateActions
    .filter((value) => value.action === 'addInterfaceInteraction')
    .filter((value) => value?.fields?.notification)
    .forEach((value) => {
      value.fields.notification = utils.getNotificationForTracking(
        JSON.parse(value.fields.notification),
      )
    })
  return copyOfUpdateActions
}

async function calculateUpdateActionsForPayment(payment, notification, logger) {
  const updateActions = []
  const notificationRequestItem = notification.NotificationRequestItem
  const stringifiedNotification = JSON.stringify(notification)
  // check if the interfaceInteraction is already on payment or not
  const isNotificationInInterfaceInteraction =
    payment.interfaceInteractions.some(
      (interaction) =>
        interaction.fields.notification === stringifiedNotification,
    )
  if (isNotificationInInterfaceInteraction === false)
    updateActions.push(getAddInterfaceInteractionUpdateAction(notification))
  const { pspReference } = notificationRequestItem
  const { transactionType, transactionState } =
    await getTransactionTypeAndStateOrNull(notificationRequestItem)
  if (transactionType !== null) {
    // if there is already a transaction with type `transactionType` then update its `transactionState` if necessary,
    // otherwise create a transaction with type `transactionType` and state `transactionState`

    const { eventDate } = notificationRequestItem
    const oldTransaction = _.find(
      payment.transactions,
      (transaction) => transaction.interactionId === pspReference,
    )
    if (_.isEmpty(oldTransaction))
      updateActions.push(
        getAddTransactionUpdateAction({
          timestamp: convertDateToUTCFormat(eventDate, logger),
          type: transactionType,
          state: transactionState,
          amount: notificationRequestItem.amount.value,
          currency: notificationRequestItem.amount.currency,
          interactionId: pspReference,
        }),
      )
    else if (
      compareTransactionStates(oldTransaction.state, transactionState) > 0
    ) {
      updateActions.push(
        getChangeTransactionStateUpdateAction(
          oldTransaction.id,
          transactionState,
        ),
      )
      updateActions.push(
        getChangeTransactionTimestampUpdateAction(
          oldTransaction.id,
          notificationRequestItem.eventDate,
          logger,
        ),
      )
    }
    const paymentKey = payment.key
    const newPspReference =
      notificationRequestItem.originalReference || pspReference
    if (newPspReference && newPspReference !== paymentKey) {
      updateActions.push({
        action: 'setKey',
        key: newPspReference,
      })
    }
  }

  const paymentMethodFromPayment = payment.paymentMethodInfo.method
  const paymentMethodFromNotification = notificationRequestItem.paymentMethod
  if (
    paymentMethodFromNotification &&
    paymentMethodFromPayment !== paymentMethodFromNotification
  ) {
    updateActions.push(
      getSetMethodInfoMethodAction(paymentMethodFromNotification),
    )
    const action = getSetMethodInfoNameAction(paymentMethodFromNotification)
    if (action) updateActions.push(action)
  }

  return updateActions
}

/**
 * Compares transaction states
 * @param currentState state of the transaction from the CT platform
 * @param newState state of the transaction from the Adyen notification
 * @return number 1 if newState can appear after currentState
 * -1 if newState cannot appear after currentState
 * 0 if newState is the same as currentState
 * @throws Error when newState and/or currentState is a wrong transaction state
 * */
function compareTransactionStates(currentState, newState) {
  const transactionStateFlow = {
    Initial: 0,
    Pending: 1,
    Success: 2,
    Failure: 3,
  }
  if (
    !transactionStateFlow.hasOwnProperty(currentState) ||
    !transactionStateFlow.hasOwnProperty(newState)
  ) {
    const errorMessage = `Wrong transaction state passed. CurrentState: ${currentState}, newState: ${newState}`
    throw new Error(errorMessage)
  }
  return transactionStateFlow[newState] - transactionStateFlow[currentState]
}

function getAddInterfaceInteractionUpdateAction(notification) {
  const moduleConfig = config.getModuleConfig()
  const notificationToUse = _.cloneDeep(notification)

  // Put the recurringDetailReference out of additionalData to avoid removal
  if (
    notificationToUse.NotificationRequestItem?.additionalData &&
    notificationToUse.NotificationRequestItem?.additionalData[
      'recurring.recurringDetailReference'
    ]
  ) {
    const recurringDetailReference =
      notificationToUse.NotificationRequestItem.additionalData[
        'recurring.recurringDetailReference'
      ]

    notificationToUse.NotificationRequestItem.recurringDetailReference =
      recurringDetailReference
  }

  if (
    notificationToUse.NotificationRequestItem?.additionalData &&
    notificationToUse.NotificationRequestItem?.additionalData[
      'recurringProcessingModel'
    ]
  ) {
    const { recurringProcessingModel } =
      notificationToUse.NotificationRequestItem.additionalData

    notificationToUse.NotificationRequestItem.recurringProcessingModel =
      recurringProcessingModel
  }

  if (
    notificationToUse.NotificationRequestItem?.additionalData &&
    notificationToUse.NotificationRequestItem?.additionalData[
      'recurring.shopperReference'
    ]
  ) {
    const recurringShopperReference =
      notificationToUse.NotificationRequestItem.additionalData[
        'recurring.shopperReference'
      ]

    notificationToUse.NotificationRequestItem.recurringShopperReference =
      recurringShopperReference
  }

  if (moduleConfig.removeSensitiveData) {
    // strip away sensitive data
    delete notificationToUse.NotificationRequestItem.additionalData
    delete notificationToUse.NotificationRequestItem.reason
  }

  const eventCode = _.isNil(notificationToUse.NotificationRequestItem.eventCode)
    ? ''
    : notificationToUse.NotificationRequestItem.eventCode.toLowerCase()

  return {
    action: 'addInterfaceInteraction',
    type: {
      key: 'ctp-adyen-integration-interaction-notification',
      typeId: 'type',
    },
    fields: {
      createdAt: new Date(),
      status: eventCode,
      type: 'notification',
      notification: JSON.stringify(notificationToUse),
    },
  }
}

function getChangeTransactionStateUpdateAction(
  transactionId,
  newTransactionState,
) {
  return {
    action: 'changeTransactionState',
    transactionId,
    state: newTransactionState,
  }
}

function convertDateToUTCFormat(transactionEventDate, logger) {
  try {
    // Assume transactionEventDate should be in correct format (e.g. '2019-01-30T18:16:22+01:00')
    const eventDateMilliSecondsStr = Date.parse(transactionEventDate)
    const transactionDate = new Date(eventDateMilliSecondsStr)
    return transactionDate.toISOString()
  } catch (err) {
    // if transactionEventDate is incorrect in format
    logger.error(
      err,
      `Fail to convert notification event date "${transactionEventDate}" to UTC format`,
    )
    return new Date().toISOString()
  }
}

function getChangeTransactionTimestampUpdateAction(
  transactionId,
  transactionEventDate,
  logger,
) {
  return {
    action: 'changeTransactionTimestamp',
    transactionId,
    timestamp: convertDateToUTCFormat(transactionEventDate, logger),
  }
}

async function getTransactionTypeAndStateOrNull(notificationRequestItem) {
  const adyenEvents = await utils.readAndParseJsonFile(
    'resources/adyen-events.json',
  )
  const adyenEventCode = notificationRequestItem.eventCode
  const adyenEventSuccess = notificationRequestItem.success

  // eslint-disable-next-line max-len
  const adyenEvent = _.find(
    adyenEvents,
    (e) => e.eventCode === adyenEventCode && e.success === adyenEventSuccess,
  )
  if (adyenEvent && adyenEventCode === 'CANCEL_OR_REFUND') {
    /* we need to get correct action from the additional data, for example:
     "NotificationRequestItem":{
        "additionalData":{
           "modification.action":"refund"
        }
        ...
      }
     */
    const modificationAction = notificationRequestItem.additionalData
      ? notificationRequestItem.additionalData['modification.action']
      : null
    if (modificationAction === 'refund') adyenEvent.transactionType = 'Refund'
    else if (modificationAction === 'cancel')
      adyenEvent.transactionType = 'CancelAuthorization'
  }
  return (
    adyenEvent || {
      eventCode: adyenEventCode,
      success: adyenEventSuccess,
      transactionType: null,
      transactionState: null,
    }
  )
}

function getAddTransactionUpdateAction({
  timestamp,
  type,
  state,
  amount,
  currency,
  interactionId,
}) {
  return {
    action: 'addTransaction',
    transaction: {
      timestamp,
      type,
      amount: {
        currencyCode: currency,
        centAmount: amount,
      },
      state,
      interactionId,
    },
  }
}

function getSetMethodInfoMethodAction(paymentMethod) {
  return {
    action: 'setMethodInfoMethod',
    method: paymentMethod,
  }
}

function getSetMethodInfoNameAction(paymentMethod) {
  const paymentMethodsToLocalizedNames = config.getAdyenPaymentMethodsToNames()
  const paymentMethodLocalizedNames =
    paymentMethodsToLocalizedNames[paymentMethod]
  if (paymentMethodLocalizedNames)
    return {
      action: 'setMethodInfoName',
      name: paymentMethodLocalizedNames,
    }
  return null
}

async function getPaymentByMerchantReference(
  merchantReference,
  pspReference,
  ctpClient,
) {
  try {
    const keys = [merchantReference, pspReference]
    const result = await ctpClient.fetchByKeys(ctpClient.builder.payments, keys)
    return result.body.results[0]
  } catch (err) {
    if (err.statusCode === 404) return null
    const errMsg =
      `Failed to fetch a payment with merchantReference ${merchantReference} and pspReference ${pspReference}. ` +
      `Error: ${JSON.stringify(serializeError(err))}`
    throw new VError(err, errMsg)
  }
}

export default { processNotification }
