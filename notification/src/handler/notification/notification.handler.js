const _ = require('lodash')
const { serializeError } = require('serialize-error')
const { validateHmacSignature } = require('../../utils/hmacValidator')
const adyenEvents = require('../../../resources/adyen-events.json')
const { getNotificationForTracking } = require('../../utils/commons')
const ctp = require('../../utils/ctp')
const config = require('../../config/config')
const mainLogger = require('../../utils/logger').getLogger()

class CommercetoolsError extends Error {
  constructor({ stack, message, statusCode }) {
    super()
    this.stack = stack
    this.message = message
    this.retry = this._shouldRetry(statusCode)
  }

  /**
   * recoverable: notification delivery can be retried by Adyen (return 500)
   * non recoverable: notification delivery can not be retried by Adyen
   * as it most probably would fail again (return "accepted")
   *
   * If commercetools status code is defined and is 5xx then return `500` to Adyen -> recoverable
   * If during communication with commercetools we got a `NetworkError` then return `500` -> recoverable
   * If commercetools status code is not OK but also not 5xx or 409 then return `accepted` -> non recoverable
   */
  _shouldRetry(statusCode) {
    return statusCode < 200 || statusCode === 409 || statusCode >= 500
  }
}

async function processNotification(
  notification,
  enableHmacSignature,
  ctpProjectConfig
) {
  const logger = mainLogger.child({
    commercetools_project_key: ctpProjectConfig.projectKey,
  })

  if (enableHmacSignature) {
    const errorMessage = validateHmacSignature(notification)
    if (errorMessage) {
      logger.error(
        { notification: getNotificationForTracking(notification) },
        `HMAC validation failed. Reason: "${errorMessage}"`
      )
      return
    }
  }

  const merchantReference = _.get(
    notification,
    'NotificationRequestItem.merchantReference',
    null
  )
  if (merchantReference === null) {
    logger.error(
      { notification: getNotificationForTracking(notification) },
      "Can't extract merchantReference from the notification"
    )
    return
  }

  const ctpClient = ctp.get(ctpProjectConfig)

  const payment = await getPaymentByMerchantReference(
    merchantReference,
    ctpClient
  )
  if (payment !== null)
    await updatePaymentWithRepeater(payment, notification, ctpClient, logger)
  else
    logger.error(
      `Payment with merchantReference: ${merchantReference} was not found`
    )
}

async function updatePaymentWithRepeater(
  payment,
  notification,
  ctpClient,
  logger
) {
  const maxRetry = 20
  let currentPayment = payment
  let currentVersion = payment.version
  let retryCount = 0
  let retryMessage
  let updateActions
  while (true) {
    updateActions = calculateUpdateActionsForPayment(
      currentPayment,
      notification
    )
    if (updateActions.length === 0) {
      break
    }
    logger.debug(
      `Update payment with key ${
        currentPayment.key
      } with update actions [${JSON.stringify(updateActions)}]`
    )
    try {
      /* eslint-disable-next-line no-await-in-loop */
      await ctpClient.update(
        ctpClient.builder.payments,
        currentPayment.id,
        currentVersion,
        updateActions
      )
      logger.debug(
        `Payment with key ${currentPayment.key} was successfully updated`
      )
      break
    } catch (err) {
      const moduleConfig = config.getModuleConfig()
      let updateActionsToLog = updateActions
      if (!moduleConfig.logSensitiveData)
        updateActionsToLog =
          _obfuscateNotificationInfoFromActionFields(updateActions)
      if (err.statusCode !== 409)
        throw new CommercetoolsError({
          stack: err.stack,
          message:
            `Unexpected error on payment update with ID: ${currentPayment.id}.` +
            `Failed actions: ${JSON.stringify(updateActionsToLog)}`,
          statusCode: err.statusCode,
        })
      retryCount += 1
      if (retryCount > maxRetry) {
        retryMessage =
          'Got a concurrent modification error' +
          ` when updating payment with id "${currentPayment.id}".` +
          ` Version tried "${currentVersion}",` +
          ` currentVersion: "${err.body.errors[0].currentVersion}".`
        throw new CommercetoolsError({
          stack: err.stack,
          message:
            `${retryMessage} Won't retry again` +
            ` because of a reached limit ${maxRetry}` +
            ` max retries. Failed actions: ${JSON.stringify(
              updateActionsToLog
            )}`,
          statusCode: err.statusCode,
        })
      }
      /* eslint-disable-next-line no-await-in-loop */
      const response = await ctpClient.fetchById(
        ctpClient.builder.payments,
        currentPayment.id
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
      value.fields.notification = getNotificationForTracking(
        JSON.parse(value.fields.notification)
      )
    })
  return copyOfUpdateActions
}

function calculateUpdateActionsForPayment(payment, notification) {
  const updateActions = []
  const notificationRequestItem = notification.NotificationRequestItem
  const stringifiedNotification = JSON.stringify(notification)
  // check if the interfaceInteraction is already on payment or not
  const isNotificationInInterfaceInteraction =
    payment.interfaceInteractions.some(
      (interaction) =>
        interaction.fields.notification === stringifiedNotification
    )
  if (isNotificationInInterfaceInteraction === false)
    updateActions.push(getAddInterfaceInteractionUpdateAction(notification))

  const { transactionType, transactionState } =
    getTransactionTypeAndStateOrNull(notificationRequestItem)
  if (transactionType !== null) {
    // if there is already a transaction with type `transactionType` then update its `transactionState` if necessary,
    // otherwise create a transaction with type `transactionType` and state `transactionState`
    const { pspReference } = notificationRequestItem
    const oldTransaction = _.find(
      payment.transactions,
      (transaction) => transaction.interactionId === pspReference
    )
    if (_.isEmpty(oldTransaction))
      updateActions.push(
        getAddTransactionUpdateAction({
          type: transactionType,
          state: transactionState,
          amount: notificationRequestItem.amount.value,
          currency: notificationRequestItem.amount.currency,
          interactionId: pspReference,
        })
      )
    else if (
      compareTransactionStates(oldTransaction.state, transactionState) > 0
    )
      updateActions.push(
        getChangeTransactionStateUpdateAction(
          oldTransaction.id,
          transactionState
        )
      )
  }
  const paymentMethodFromPayment = payment.paymentMethodInfo.method
  const paymentMethodFromNotification = notificationRequestItem.paymentMethod
  if (
    paymentMethodFromNotification &&
    paymentMethodFromPayment !== paymentMethodFromNotification
  ) {
    updateActions.push(
      getSetMethodInfoMethodAction(paymentMethodFromNotification)
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
    Failure: 2,
  }
  if (
    !transactionStateFlow.hasOwnProperty(currentState) ||
    !transactionStateFlow.hasOwnProperty(newState)
  )
    throw new CommercetoolsError({
      message: `Wrong transaction state passed. CurrentState: ${currentState}, newState: ${newState}`,
    })

  return transactionStateFlow[newState] - transactionStateFlow[currentState]
}

function getAddInterfaceInteractionUpdateAction(notification) {
  const moduleConfig = config.getModuleConfig()
  if (!moduleConfig.logSensitiveData) {
    // strip away sensitive data
    delete notification.NotificationRequestItem.additionalData
    delete notification.NotificationRequestItem.reason
  }

  const eventCode = _.isNil(notification.NotificationRequestItem.eventCode)
    ? ''
    : notification.NotificationRequestItem.eventCode.toLowerCase()

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
      notification: JSON.stringify(notification),
    },
  }
}

function getChangeTransactionStateUpdateAction(
  transactionId,
  newTransactionState
) {
  return {
    action: 'changeTransactionState',
    transactionId,
    state: newTransactionState,
  }
}

function getTransactionTypeAndStateOrNull(notificationRequestItem) {
  const adyenEventCode = notificationRequestItem.eventCode
  const adyenEventSuccess = notificationRequestItem.success

  // eslint-disable-next-line max-len
  const adyenEvent = _.find(
    adyenEvents,
    (e) => e.eventCode === adyenEventCode && e.success === adyenEventSuccess
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
  type,
  state,
  amount,
  currency,
  interactionId,
}) {
  return {
    action: 'addTransaction',
    transaction: {
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

async function getPaymentByMerchantReference(merchantReference, ctpClient) {
  try {
    const result = await ctpClient.fetchByKey(
      ctpClient.builder.payments,
      merchantReference
    )
    return result.body
  } catch (err) {
    if (err.statusCode === 404) return null

    throw new CommercetoolsError({
      stack: err.stack,
      message:
        `Failed to fetch a payment with merchantReference: ${merchantReference}. ` +
        `Error: ${JSON.stringify(serializeError(err))}`,
      statusCode: err.statusCode,
    })
  }
}

module.exports = { processNotification }
