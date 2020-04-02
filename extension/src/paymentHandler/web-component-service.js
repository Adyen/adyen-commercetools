const fetch = require('node-fetch')
const configLoader = require('../config/config')
const config = configLoader.load()

//todo(ahmet): add integration tests for those methods, both success and failed cases.
function getOriginKeys (paymentObject) {
  const getOriginKeysRequest = paymentObject.custom.fields.getOriginKeysRequest
  return callAdyen('originKeys', getOriginKeysRequest)
}

async function getPaymentMethods (paymentObject) {
  const getOriginKeysRequest = paymentObject.custom.fields.getPaymentMethodsRequest
  return callAdyen('paymentMethods', getOriginKeysRequest)
}

async function callAdyen(endpoint, requestString) {
  // todo(ahmet): no error handling or logs, it also need to serialise and persist the error as a response.
  const request = buildRequest(requestString)
  const result = await fetch(`${config.adyen.apiBaseUrl}/${endpoint}`, request)
  const response = await result.json()
  return { request, response }
}

function buildRequest (requestString) {
  const body = JSON.stringify({
    merchantAccount: config.adyen.merchantAccount,
    ...JSON.parse(requestString)
  })

  return {
    method: 'POST',
    body: body,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': config.adyen.apiKey
    }
  }
}

module.exports = {
  getOriginKeys,
  getPaymentMethods
}
