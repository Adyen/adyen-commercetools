import _ from 'lodash'
import c from '../config/constants.js'
import config from '../config/config.js'

const { getAdyenPaymentMethodsToNames } = config

function getAuthorizationTransactionSuccess(paymentObject) {
  return getTransactionWithTypesAndStates(
    paymentObject,
    ['Authorization'],
    ['Success'],
  )
}

function getCancelAuthorizationTransactionInit(paymentObject) {
  return getTransactionWithTypesAndStates(
    paymentObject,
    ['CancelAuthorization'],
    ['Initial'],
  )
}

function listRefundTransactionsInit(paymentObject) {
  return listTransactionsWithTypesAndStates(
    paymentObject,
    ['Refund'],
    ['Initial'],
  )
}

function getTransactionWithTypesAndStates(paymentObject, types, states) {
  return paymentObject.transactions.find(
    (t) => types.includes(t.type) && states.includes(t.state),
  )
}

function listTransactionsWithTypesAndStates(paymentObject, types, states) {
  return paymentObject.transactions.filter(
    (t) => types.includes(t.type) && states.includes(t.state),
  )
}

function createAddInterfaceInteractionAction({ request, response, type }) {
  return {
    action: 'addInterfaceInteraction',
    type: { key: c.CTP_PAYMENT_INTERACTION_CUSTOM_TYPE_KEY },
    fields: {
      createdAt: new Date().toISOString(),
      response: JSON.stringify(response),
      request: JSON.stringify(request),
      type,
    },
  }
}

function createChangeTransactionStateAction(transactionId, transactionState) {
  return {
    action: 'changeTransactionState',
    transactionId,
    state: _.capitalize(transactionState),
  }
}

function createSetCustomFieldAction(name, response) {
  return {
    action: 'setCustomField',
    name,
    value: JSON.stringify(response),
  }
}

function createSetMethodInfoMethodAction(paymentMethod) {
  return {
    action: 'setMethodInfoMethod',
    method: paymentMethod,
  }
}

function createSetMethodInfoNameAction(paymentMethod) {
  const paymentMethodsToLocalizedNames = getAdyenPaymentMethodsToNames()
  const paymentMethodLocalizedNames =
    paymentMethodsToLocalizedNames[paymentMethod]
  if (paymentMethodLocalizedNames)
    return {
      action: 'setMethodInfoName',
      name: paymentMethodLocalizedNames,
    }
  return null
}

function createChangeTransactionInteractionId(transactionId, interactionId) {
  return {
    action: 'changeTransactionInteractionId',
    transactionId,
    interactionId,
  }
}

function createAddTransactionAction({
  type,
  state,
  amount,
  currency,
  interactionId,
  custom,
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
      custom,
    },
  }
}

function createAddTransactionActionByResponse(amount, currencyCode, response) {
  // eslint-disable-next-line default-case
  switch (response.resultCode) {
    case 'Authorised':
      return createAddTransactionAction({
        type: 'Authorization',
        state: 'Success',
        amount,
        currency: currencyCode,
        interactionId: response.pspReference,
      })
    case 'Refused':
    case 'Error':
      return createAddTransactionAction({
        type: 'Authorization',
        state: 'Failure',
        amount,
        currency: currencyCode,
        interactionId: response.pspReference,
      })
  }
  return null
}

function getChargeTransactionInitial(paymentObject) {
  return getTransactionWithTypesAndStates(
    paymentObject,
    ['Charge'],
    ['Initial'],
  )
}

function getChargeTransactionPending(paymentObject) {
  return getTransactionWithTypesAndStates(
    paymentObject,
    ['Charge'],
    ['Pending'],
  )
}

function getChargeTransactionSuccess(paymentObject) {
  return getTransactionWithTypesAndStates(
    paymentObject,
    ['Charge'],
    ['Success'],
  )
}

function getLatestInterfaceInteraction(interfaceInteractions, type) {
  return interfaceInteractions
    .filter((interaction) => interaction.fields.type === type)
    .sort((i1, i2) => i1.fields.createdAt.localeCompare(i2.fields.createdAt))
    .pop()
}

function isValidJSON(jsonString) {
  if (typeof jsonString === 'undefined') return true
  try {
    const o = JSON.parse(jsonString)
    if (o && typeof o === 'object') return true
  } catch (e) {
    // continue regardless of error
  }
  return false
}

function isValidMetadata(str) {
  if (!str) return false
  return str.indexOf(' ') < 0
}

function getIdempotencyKey(transaction) {
  let idempotencyKey = transaction.custom?.fields?.idempotencyKey
  if (!idempotencyKey && config.getModuleConfig().generateIdempotencyKey)
    idempotencyKey = transaction.id
  return idempotencyKey
}

function getPaymentKeyUpdateAction(paymentKey, request, response) {
  const requestBodyJson = JSON.parse(request.body)
  const reference = requestBodyJson.reference?.toString()
  const pspReference = response.pspReference?.toString()
  const newReference = pspReference || reference
  let paymentKeyUpdateAction
  // ensure the key and new reference is different, otherwise the error with
  // "code": "InvalidOperation", "message": "'key' has no changes." will return by commercetools API.
  if (newReference !== paymentKey) {
    paymentKeyUpdateAction = {
      action: 'setKey',
      key: newReference,
    }
  }
  return paymentKeyUpdateAction
}

export {
  getChargeTransactionInitial,
  getChargeTransactionPending,
  getAuthorizationTransactionSuccess,
  getChargeTransactionSuccess,
  getCancelAuthorizationTransactionInit,
  listRefundTransactionsInit,
  createAddInterfaceInteractionAction,
  createChangeTransactionStateAction,
  createSetCustomFieldAction,
  createChangeTransactionInteractionId,
  createAddTransactionAction,
  createAddTransactionActionByResponse,
  createSetMethodInfoMethodAction,
  createSetMethodInfoNameAction,
  getLatestInterfaceInteraction,
  isValidJSON,
  isValidMetadata,
  getIdempotencyKey,
  getPaymentKeyUpdateAction,
}
