const fetch = require('node-fetch')
const configLoader = require('../config/config')
const c = require('../config/constants')

const config = configLoader.load()
async function handlePayment (paymentObject) {
  const { request, response } = await _fetchPaymentMethods(paymentObject)
  const responseBody = await response.json()
  return {
    version: paymentObject.version,
    actions: [{
      action: 'addInterfaceInteraction',
      type: { key: c.CTP_INTERFACE_INTERACTION },
      fields: {
        timestamp: new Date(),
        response: JSON.stringify(responseBody),
        request: JSON.stringify(request),
        type: 'getAvailablePaymentMethods'
      }
    }]
  }
}

function _getTransaction (paymentObject) {
  return paymentObject.transactions.find(t => t.type.toLowerCase() === 'charge'
    && (t.state.toLowerCase() === 'initial' || t.state.toLowerCase() === 'pending'))
}

async function _fetchPaymentMethods (paymentObject) {
  const body = {
    merchantAccount: config.adyen.merchantAccount,
    countryCode: paymentObject.custom.fields.countryCode,
    amount: {
      currency: paymentObject.amountPlanned.currencyCode,
      value: paymentObject.amountPlanned.centAmount
    }
  }
  const transaction = _getTransaction(paymentObject)
  if (transaction)
    body.amount = {
      currency: transaction.amount.currencyCode,
      value: transaction.amount.centAmount
    }
  const request = {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-api-key': config.adyen.apiKey, 'Content-Type': 'application/json' }
  }
  const response = await fetch(`${config.adyen.apiBaseUrl}/paymentMethods`, request)

  return { response, request }
}

module.exports = { handlePayment }
