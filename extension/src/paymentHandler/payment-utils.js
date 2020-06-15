const _ = require('lodash')
const c = require('../config/constants')

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
    request, response, type
  }
) {
  return {
    action: 'addInterfaceInteraction',
    type: { key: c.CTP_PAYMENT_INTERACTION_CUSTOM_TYPE_KEY },
    fields: {
      createdAt: new Date().toISOString(),
      response: JSON.stringify(response),
      request: JSON.stringify(request),
      type
    }
  }
}

function ensureAddInterfaceInteractionAction (
  {
    paymentObject, request, response, type
  }
) {
  const interactions = paymentObject.interfaceInteractions

  const matchedInteraction = _.find(interactions,
    interaction => interaction.fields.request === JSON.stringify(request)
      || interaction.fields.response === JSON.stringify(response))

  if (!matchedInteraction)
    return createAddInterfaceInteractionAction({
      request, response, type
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

function createAddTransactionAction ({
 type, state, amount, currency, interactionId
}) {
  return {
    action: 'addTransaction',
    transaction: {
      type,
      amount: {
        currencyCode: currency,
        centAmount: amount
      },
      state,
      interactionId
    }
  }
}

function createAddTransactionActionByResponse (amount, currencyCode, response) {
  // eslint-disable-next-line default-case
  switch (response.resultCode) {
    case 'Authorised':
      return createAddTransactionAction({
        type: 'Authorization',
        state: 'Success',
        amount,
        currency: currencyCode,
        interactionId: response.pspReference
      })
    case 'Refused':
    case 'Error':
      return createAddTransactionAction({
        type: 'Authorization',
        state: 'Failure',
        amount,
        currency: currencyCode,
        interactionId: response.pspReference
      })
  }
  return null
}

function getLatestInterfaceInteraction (interfaceInteractions, type) {
  return interfaceInteractions
    .filter(interaction => interaction.fields.type === type)
    .sort((i1, i2) => i1.fields.createdAt.localeCompare(i2.fields.createdAt))
    .pop()
}

function isValidJSON (jsonString) {
  if (typeof jsonString === 'undefined')
    return true
  try {
    const o = JSON.parse(jsonString)
    if (o && typeof o === 'object')
      return true
  } catch (e) {
    // continue regardless of error
  }
  return false
}

module.exports = {
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
  createChangeTransactionInteractionId,
  createAddTransactionAction,
  createAddTransactionActionByResponse,
  getLatestInterfaceInteraction,
  isValidJSON
}
