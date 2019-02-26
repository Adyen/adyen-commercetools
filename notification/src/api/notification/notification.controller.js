const _ = require('lodash')
const Promise = require('bluebird')
const httpUtils = require('../../utils/commons')
const config = require('../../config/config').load()
const ctp = require('../../utils/ctp')
const ctpClient = ctp.get(config)

const adyenEvents = require('../../../resources/adyenEvents')

// TODO: add JSON schema validation:
// https://github.com/commercetools/commercetools-adyen-integration/issues/9
async function handleNotification (request, response, logger) {
  const body = await httpUtils.collectRequestData(request, response)
  try {
    await processNotifications(JSON.parse(body), logger)
    response.statusCode = 200
    return response.end("{ notificationResponse : '[accepted]' }")
  } catch(e) {
    logger.error(e, 'Ooops')
    response.statusCode = 500
    return response.end()
  }
}

// TODO: proper naming
async function processNotifications (request, logger) {
  const notifications = request.notificationItems
  await Promise.map(notifications, notification => processNotification(notification, logger))
}

// TODO: proper naming
async function processNotification (notification, logger) {
  const merchantReference = _.get(notification, 'NotificationRequestItem.merchantReference', null)
  if (merchantReference === null) {
    logger.error(`Can't extract merchantReference from the notification: ${JSON.stringify(notification)}`)
    return null
  }

  let updateActions
  let payment
  try {
    payment = await getPaymentByMerchantReference(merchantReference)
    updateActions = calculateUpdateActionsForPayment(payment, notification)
  } catch (e) {
    logger.warn(e, `Error while trying to fetch the payment for merchantReference: ${merchantReference}`)
    return null
  }

  try {
    await ctpClient.update(ctpClient.builder.payments, payment.id, payment.version, updateActions)
  } catch (e) {
    logger.error(e, `Error while updating the payment with id: ${payment.id}`)
  }
}

function calculateUpdateActionsForPayment (payment, notification) {
  const notificationEventCode = notification.eventCode
  const notificationSuccess = notification.success
  const updateActions = []
  const stringifiedNotification = JSON.stringify(notification)
  // check if interfaceInteraction already on payment or not
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

async function getPaymentByMerchantReference (merchantReference) {
  const result = await ctpClient.fetch(ctpClient.builder.payments.where(`interfaceId="${merchantReference}"`))
  return _.get(result, 'body.results[0]', null)
}

module.exports = { handleNotification }
