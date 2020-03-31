const fetch = require('node-fetch')
const configLoader = require('../config/config')
const pU = require('./payment-utils')
const c = require('../config/constants')

const config = configLoader.load()

async function handlePayment (paymentObject) {
  const { request, response } = await _fetchPaymentMethods(paymentObject)
  const responseBody = await response.json()
  return {
    actions: [
      pU.createAddInterfaceInteractionAction({
        request, response: responseBody, type: c.CTP_INTERACTION_TYPE_FETCH_METHODS // todo: type could be changed ?
      })
      //, pU.createSetCustomFieldAction(c.CTP_CUSTOM_FIELD_GET_PAYMENT_METHODS_RESPONSE, responseBody)
    ]
  }
}

function _getTransaction (paymentObject) {
  return paymentObject.transactions.find(t => t.type.toLowerCase() === 'authorization'
    && (t.state.toLowerCase() === 'initial' || t.state.toLowerCase() === 'pending'))
}

async function _fetchPaymentMethods (paymentObject) {
  // todo: use paymentObject.custom.fields.getPaymentMethodsRequest
  const getPaymentMethodsRequest = {
    countryCode: 'DE',
    amount: {
      currency: paymentObject.amountPlanned.currencyCode,
      value: paymentObject.amountPlanned.centAmount
    }
  }
  const body = {
    merchantAccount: config.adyen.merchantAccount,
    ...getPaymentMethodsRequest
  }
  // todo: is this possible now ?
  const transaction = _getTransaction(paymentObject)
  if (transaction)
    body.amount = {
      currency: transaction.amount.currencyCode,
      value: transaction.amount.centAmount
    }

  // todo: use a common util for that part which is shared in multiple places
  const request = {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-api-key': config.adyen.apiKey, 'Content-Type': 'application/json' }
  }
  const response = await fetch(`${config.adyen.apiBaseUrl}/paymentMethods`, request)

  return { response, request }
}

module.exports = { handlePayment }
