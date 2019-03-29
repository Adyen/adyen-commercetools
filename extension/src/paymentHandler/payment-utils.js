const _ = require('lodash')
const c = require('../config/constants')

function getChargeTransactionInitOrPending (paymentObject) {
  return getTransactionWithTypesAndStates(paymentObject,
    ['Charge'],
    ['Initial', 'Pending'])
}

function getChargeTransactionPending (paymentObject) {
  return getTransactionWithTypesAndStates(paymentObject,
    ['Charge'],
    ['Pending'])
}

function getChargeTransactionInit (paymentObject) {
  return getTransactionWithTypesAndStates(paymentObject,
    ['Charge'],
    ['Initial'])
}

function getTransactionWithTypesAndStates (paymentObject, types, states) {
  return paymentObject.transactions.find(t => types.includes(t.type)
    && (states.includes(t.state)))
}

// see https://docs.adyen.com/developers/payments-basics/payments-lifecycle
// and https://docs.adyen.com/developers/checkout/payment-result-codes
function getMatchingCtpState (adyenState) {
  const paymentAdyenStateToCtpState = {
    redirectshopper: c.CTP_TXN_STATE_PENDING,
    received: c.CTP_TXN_STATE_PENDING,
    pending: c.CTP_TXN_STATE_PENDING,
    authorised: c.CTP_TXN_STATE_SUCCESS,
    refused: c.CTP_TXN_STATE_FAILURE,
    cancelled: c.CTP_TXN_STATE_FAILURE,
    error: c.CTP_TXN_STATE_FAILURE
  }
  return paymentAdyenStateToCtpState[adyenState]
}

function createAddInterfaceInteractionAction (
  {
    request, response, type, status
  }
) {
  return {
    action: 'addInterfaceInteraction',
    type: { key: c.CTP_INTERFACE_INTERACTION },
    fields: {
      timestamp: new Date().toISOString(),
      response: JSON.stringify(response),
      request: JSON.stringify(request),
      type,
      status
    }
  }
}

function ensureAddInterfaceInteractionAction (
  {
    paymentObject, request, response, type, status
  }
) {
  const interactions = paymentObject.interfaceInteractions

  const matchedInteraction = _.find(interactions,
    interaction => interaction.fields.request === JSON.stringify(request)
        || interaction.fields.response === JSON.stringify(response))

  if (!matchedInteraction)
    return createAddInterfaceInteractionAction({
      request, response, type, status
    })
  return null
}

function createChangeTransactionStateAction (transactionId, transactionState) {
  return {
    action: 'changeTransactionState',
    transactionId,
    state: _.capitalize(transactionState)
  }
}

function createSetCustomFieldAction (name, value) {
  return {
    action: 'setCustomField',
    name,
    value
  }
}

function createChangeTransactionInteractionId (transactionId, interactionId) {
  return {
    action: 'changeTransactionInteractionId',
    transactionId,
    interactionId
  }
}

module.exports = {
  getChargeTransactionInitOrPending,
  getChargeTransactionPending,
  getChargeTransactionInit,
  getMatchingCtpState,
  createAddInterfaceInteractionAction,
  ensureAddInterfaceInteractionAction,
  createChangeTransactionStateAction,
  createSetCustomFieldAction,
  createChangeTransactionInteractionId
}
