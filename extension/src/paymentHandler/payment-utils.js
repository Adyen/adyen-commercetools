const _ = require('lodash')
const c = require('../config/constants')

function getAuthorizationTransactionInitOrPending (paymentObject) {
  return getTransactionWithTypesAndStates(paymentObject,
    ['Authorization'],
    ['Initial', 'Pending'])
}

function getAuthorizationTransactionPending (paymentObject) {
  return getTransactionWithTypesAndStates(paymentObject,
    ['Authorization'],
    ['Pending'])
}

function getAuthorizationTransactionSuccess (paymentObject) {
  return getTransactionWithTypesAndStates(paymentObject,
    ['Authorization'],
    ['Success'])
}

function getCancelAuthorizationTransactionInit (paymentObject) {
  return getTransactionWithTypesAndStates(paymentObject,
    ['CancelAuthorization'],
    ['Initial'])
}

function getRefundTransactionInit (paymentObject) {
  return getTransactionWithTypesAndStates(paymentObject,
    ['Refund'],
    ['Initial'])
}

function getAuthorizationTransactionInit (paymentObject) {
  return getTransactionWithTypesAndStates(paymentObject,
    ['Authorization'],
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
  // strip away sensitive data
  delete response.additionalData

  return {
    action: 'addInterfaceInteraction',
    type: { key: c.CTP_INTERFACE_INTERACTION_TYPE_KEY },
    fields: {
      createdAt: new Date(), //todo(ahmet): maybe its better to use iso date.
      response: JSON.stringify(response),
      request: request.body,
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

function createSetCustomFieldAction (name, response) {
  return {
    action: 'setCustomField',
    name,
    value: JSON.stringify(response)
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
  getAuthorizationTransactionInitOrPending,
  getAuthorizationTransactionPending,
  getAuthorizationTransactionInit,
  getAuthorizationTransactionSuccess,
  getCancelAuthorizationTransactionInit,
  getRefundTransactionInit,
  getMatchingCtpState,
  createAddInterfaceInteractionAction,
  ensureAddInterfaceInteractionAction,
  createChangeTransactionStateAction,
  createSetCustomFieldAction,
  createChangeTransactionInteractionId
}
