const fetch = require('node-fetch')
const configLoader = require('../config/config')
const pU = require('./payment-utils')
const c = require('../config/constants')

const config = configLoader.load()

async function handlePayment (paymentObject) {
  const { request, response } = await _fetchPaymentMethods(paymentObject)
  return {
    actions: [
      // todo(ahmet): potential change in here as both of them is persisting request, response.
      pU.createAddInterfaceInteractionAction({
        request, response, type: c.CTP_INTERACTION_TYPE_GET_PAYMENT_METHODS
      }),
      pU.createSetCustomFieldAction(c.CTP_CUSTOM_FIELD_GET_PAYMENT_METHODS_RESPONSE, response)
    ]
  }
}

async function _fetchPaymentMethods (paymentObject) {
  const body = {
    merchantAccount: config.adyen.merchantAccount,
    ...JSON.parse(paymentObject.custom.fields.getPaymentMethodsRequest) // todo: those parts will be duplicated for each.
  }
  // todo(ahmet): use a common util for that part which is shared in multiple places
  const request = {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-api-key': config.adyen.apiKey, 'Content-Type': 'application/json' }
  }
  const response = await fetch(`${config.adyen.apiBaseUrl}/paymentMethods`, request)
    .then(response => response.json())

  return { response, request }
}

module.exports = { handlePayment }
