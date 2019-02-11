const fetch = require('node-fetch')
const configLoader = require('../config/config')
const c = require('../config/constants')

const config = configLoader.load()

function isSupported (paymentObject) {
  return paymentObject.paymentMethodInfo.paymentInterface === 'ctp-adyen-integration'
    && !paymentObject.paymentMethodInfo.method
}

async function handlePayment (paymentObject) {
  const result = await _fetchPaymentMethods(paymentObject)
  return {
    version: paymentObject.version,
    actions: [{
      action: 'addInterfaceInteraction',
      type: { key: c.CTP_INTERFACE_INTERACTION_RESPONSE },
      fields: {
        timestamp: new Date(),
        response: JSON.stringify(result),
        type: 'getPaymentDetails',
        status: c.SUCCESS
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
  const resultPromise = await fetch(`${config.adyen.apiBaseUrl}/paymentMethods`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-api-key': config.adyen.apiKey, 'Content-Type': 'application/json' }
  })

  return resultPromise.json()
}

module.exports = { isSupported, handlePayment }
