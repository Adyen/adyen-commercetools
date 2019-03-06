const _ = require('lodash')
const Promise = require('bluebird')
const serializeError = require('serialize-error')
const ctp = require('../../utils/ctp')
const adyenEvents = require('../../../resources/adyenEvents')

async function processNotifications (notifications, logger, ctpClient) {
  await Promise.map(notifications,
      notification => processNotification(notification.NotificationRequestItem, logger, ctpClient),
    { concurrency: 10 })
}

async function processNotification (notification, logger, ctpClient) {
  const merchantReference = _.get(notification, 'merchantReference', null)
  if (merchantReference === null) {
    logger.error(`Can't extract merchantReference from the notification: ${JSON.stringify(notification)}`)
    return null
  }

  try {
    const payment = await getPaymentByMerchantReference(merchantReference, ctpClient)
    if (payment !== null)
      await updatePaymentWithRepeater(payment, notification, ctpClient)
    else {
      logger.error(`Payment with merchantReference: ${merchantReference} was not found`)
      return null
    }
  } catch (err) {
    logger.error(err)
    return null
  }
}

async function updatePaymentWithRepeater(payment, notification, ctpClient) {
  const maxRetry = 20
  let currentPayment = payment
  let currentVersion = payment.version
  let retryCount = 0
  let retryMessage
  let updateActions
  while (true) {
    updateActions = calculateUpdateActionsForPayment(currentPayment, notification)
    try {
      await ctpClient.update(ctpClient.builder.payments, payment.id, currentVersion, updateActions)
      break
    } catch (err) {
      if (err.body.statusCode !== 409)
        throw new Error(`Unexpected error during updating a payment with ID: ${paymentId}. Exiting. `
          + `Error: ${JSON.stringify(serializeError(err))}`)
      retryCount++
      if (retryCount >= maxRetry) {
        retryMessage = `Got a concurrent modification error`
          + ` when updating payment with id "${paymentId}".`
          + ` Version tried "${currentVersion}",`
          + ` currentVersion: "${err.body.errors[0].currentVersion}".`
        throw new Error(`${retryMessage} Won't retry again`
          + ` because of a reached limit ${maxRetry}`
          + ` max retries. Error: ${JSON.stringify(serializeError(err))}`)
      }
      currentPayment = await ctpClient.fetchById(ctpClient.builder.payments, currentPayment.id)
      currentVersion = currentPayment.version
    }
  }
}

function calculateUpdateActionsForPayment (payment, notification) {
  const updateActions = []
  const notificationEventCode = notification.eventCode
  const notificationSuccess = notification.success
  const stringifiedNotification = JSON.stringify(notification)
  // check if interfaceInteraction is already on payment or not
  const isInterfaceInteractionOnPayment =
    payment.interfaceInteractions.some(interaction => interaction.fields.response === stringifiedNotification)
  if (isInterfaceInteractionOnPayment === false)
    updateActions.push(getAddInterfaceInteractionUpdateAction(notification))

  const { transactionType, transactionState } = getTransactionTypeAndStateUpdateAction(notificationEventCode, notificationSuccess)
  if (transactionType !== null) {
    // if there is already a transaction with type `transactionType` then update its `transactionState` if necessary,
    // otherwise create a transaction with type `transactionType` and state `transactionState`
    const oldTransaction = _.find(payment.transactions, (transaction) => transaction.type === transactionType)
    if (_.isEmpty(oldTransaction)) {
      updateActions.push(getAddTransactionUpdateAction(
        transactionType,
        transactionState,
        notification.amount.value,
        notification.amount.currency)
      )
    } else if (ctp.compareTransactionStates(oldTransaction.state, transactionState)) {
      updateActions.push(getChangeTransactionStateUpdateAction(oldTransaction.id, transactionState))
    }
  }
  return updateActions
}

function getAddInterfaceInteractionUpdateAction (notification) {
  return {
    action: 'addInterfaceInteraction',
    type: {
      key: 'ctp-adyen-integration-interaction-response',
      typeId: 'type'
    },
    fields: {
      status: notification.eventCode,
      type: 'notification',
      response: JSON.stringify(notification)
    }
  }
}

function getChangeTransactionStateUpdateAction (transactionId, newTransactionState) {
  return {
    action: 'changeTransactionState',
    transactionId: transactionId,
    state: newTransactionState
  }
}

function getTransactionTypeAndStateUpdateAction (adyenEventCode, adyenEventSuccess) {
  return _.find(adyenEvents, (adyenEvent) =>
    adyenEvent.eventCode === adyenEventCode && adyenEvent.success === adyenEventSuccess)
}

function getAddTransactionUpdateAction (type, state, amount, currency) {
  return {
    action: 'addTransaction',
    transaction: {
      type: type,
      amount: {
        currencyCode: currency,
        centAmount: amount
      },
      state: state
    }
  }
}

async function getPaymentByMerchantReference (merchantReference, ctpClient) {
  try {
    const result = await ctpClient.fetch(ctpClient.builder.payments.where(`interfaceId="${merchantReference}"`))
    return _.get(result, 'body.results[0]', null)
  } catch (err) {
    throw Error(`Failed to fetch a payment with merchantReference: ${merchantReference}. ` +
    `Error: ${JSON.stringify(serializeError(err))}`)
  }
}

module.exports = { processNotifications }
