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
      // todo(ahmet): potential change in here as both of them is persisting request, response.
      pU.createAddInterfaceInteractionAction({
        request, response: responseBody, type: c.CTP_INTERACTION_TYPE_FETCH_METHODS // todo(ahmet): type could be changed ?
      }),
      pU.createSetCustomFieldAction(c.CTP_CUSTOM_FIELD_GET_PAYMENT_METHODS_RESPONSE, JSON.stringify(responseBody))
    ]
  }
}

async function _fetchPaymentMethods (paymentObject) {
  const body = {
    merchantAccount: config.adyen.merchantAccount,
    ...JSON.parse(paymentObject.custom.fields.getPaymentMethodsRequest)
  }
  // todo(ahmet): use a common util for that part which is shared in multiple places
  const request = {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-api-key': config.adyen.apiKey, 'Content-Type': 'application/json' }
  }
  const response = await fetch(`${config.adyen.apiBaseUrl}/paymentMethods`, request)

  return { response, request }
}

module.exports = { handlePayment }
