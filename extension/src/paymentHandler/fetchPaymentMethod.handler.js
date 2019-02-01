const fetch = require('node-fetch')
const config = require('../config/config')
const constant = require('../config/constants')

function isSupported (paymentObject) {
  return paymentObject.paymentMethodInfo.paymentInterface === 'ctp-adyen-integration'
    && !paymentObject.paymentMethodInfo.method
}

async function handlePayment (paymentObject) {
  const result = await fetchPaymentMethods(paymentObject)
  return {
    version: paymentObject.version,
    actions: [{
      action: 'addInterfaceInteraction',
      type: { key: 'ctp-adyen-integration-interaction-response' },
      fields: {
        timestamp: new Date(),
        response: JSON.stringify(result),
        type: 'getPaymentDetails',
        status: constant.SUCCESS
      }
    }]
  }
}

async function fetchPaymentMethods (paymentObject) {
  const body = {
    merchantAccount: config.load().adyen.merchantAccount,
    countryCode: paymentObject.custom.fields.countryCode,
    amount: {
      currency: paymentObject.amountPlanned.currencyCode,
      value: paymentObject.amountPlanned.centAmount
    }
  }
  const resultPromise = await fetch(`${config.load().adyen.apiBaseUrl}/paymentMethods`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-api-key': config.load().adyen.apiKey, 'Content-Type': 'application/json' }
  })

  return resultPromise.json()
}

module.exports = { isSupported, handlePayment }
