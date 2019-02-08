const fetch = require('node-fetch')
const _ = require('lodash')
const configLoader = require('../../config/config')
const c = require('../../config/constants')

const config = configLoader.load()

const paymentAdyenStateToCtpState = {
  redirectShopper: 'Pending',
  received: 'Pending',
  pending: 'Pending',
  authorised: 'Success',
  refused: 'Failure',
  cancelled: 'Failure',
  error: 'Failure'
}

function isSupported (paymentObject) {
  const isAdyen = paymentObject.paymentMethodInfo.paymentInterface === 'ctp-adyen-integration'
  const isCreditCard = paymentObject.paymentMethodInfo.method === 'creditCard'
  const hasReferenceField = !_.isNil(paymentObject.custom.fields.reference)
  const transaction = _getTransaction(paymentObject)
  const hasTransaction = _.isObject(transaction)
  return isAdyen && isCreditCard && hasReferenceField && hasTransaction
}

async function handlePayment (paymentObject) {
  const result = await _makePayment(paymentObject)
  // for statusCodes, see https://docs.adyen.com/developers/development-resources/response-handling
  const interfaceInteractionStatus = result.status === 200 ? c.SUCCESS : c.FAILURE
  const actions = [
    {
      action: 'addInterfaceInteraction',
      type: { key: c.CTP_INTERFACE_INTERACTION_RESPONSE },
      fields: {
        timestamp: new Date(),
        response: JSON.stringify(result),
        type: 'makePayment',
        status: interfaceInteractionStatus
      }
    }
  ]
  if (result.pspReference)
    actions.push({
      action: 'setInterfaceId',
      interfaceId: result.pspReference
    })
  if (result.resultCode) {
    const transaction = _getTransaction(paymentObject)
    actions.push({
      action: 'changeTransactionState',
      transactionId: transaction.id,
      state: _.capitalize(paymentAdyenStateToCtpState[result.resultCode.toLowerCase()])
    })
  }
  return {
    version: paymentObject.version,
    actions
  }
}

function _getTransaction (paymentObject) {
  return paymentObject.transactions.find(t => t.type.toLowerCase() === 'charge'
    && (t.state.toLowerCase() === 'initial' || t.state.toLowerCase() === 'pending'))
}

async function _makePayment (paymentObject) {
  const body = {
    amount: {
      currency: paymentObject.amountPlanned.currencyCode,
      value: paymentObject.amountPlanned.centAmount
    },
    reference: paymentObject.custom.fields.reference,
    paymentMethod: {
      type: 'scheme',
      encryptedCardNumber: paymentObject.custom.fields.encryptedCardNumber,
      encryptedExpiryMonth: paymentObject.custom.fields.encryptedExpiryMonth,
      encryptedExpiryYear: paymentObject.custom.fields.encryptedExpiryYear,
      encryptedSecurityCode: paymentObject.custom.fields.encryptedSecurityCode
    },
    returnUrl: paymentObject.custom.fields.returnUrl,
    merchantAccount: config.adyen.merchantAccount
  }
  const transaction = _getTransaction(paymentObject)
  if (transaction)
    body.amount = {
      currency: transaction.amount.currencyCode,
      value: transaction.amount.centAmount
    }

  const resultPromise = await fetch(`${config.adyen.apiBaseUrl}/payments`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-api-key': config.adyen.apiKey, 'Content-Type': 'application/json' }
  })

  return resultPromise.json()
}

module.exports = { isSupported, handlePayment }
