const fetch = require('node-fetch')
const { serializeError } = require('serialize-error')
const configLoader = require('./config/config')

const config = configLoader.load()

function getOriginKeys (getOriginKeysRequestObj) {
  return callAdyen('originKeys', getOriginKeysRequestObj)
}

function getPaymentMethods (getPaymentMethodsRequestObj) {
  return callAdyen('paymentMethods', getPaymentMethodsRequestObj)
}

function makePayment (makePaymentRequest) {
  return callAdyen('payments', makePaymentRequest)
}

function submitAdditionalPaymentDetails (submitAdditionalPaymentDetailsRequest) {
  return callAdyen('payments/details', submitAdditionalPaymentDetailsRequest)
}

async function callAdyen (endpoint, request) {
  let response
  try {
    response = await fetchAsync(endpoint, request)
  } catch (err) {
    response = serializeError(err)
  }
  return { request, response }
}

async function fetchAsync (endpoint, requestObj) {
  const request = buildRequest(requestObj)
  const response = await fetch(`${config.adyen.apiBaseUrl}/${endpoint}`, request)
  const responseBody = await response.json()
  // strip away sensitive data from the adyen response.
  delete responseBody.additionalData
  return responseBody
}

function buildRequest (requestObj) {
  // ensure the merchantAccount is set with request, otherwise set.
  if (!requestObj.merchantAccount)
    requestObj.merchantAccount = config.adyen.merchantAccount

  return {
    method: 'POST',
    body: JSON.stringify(requestObj),
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': config.adyen.apiKey
    }
  }
}

module.exports = {
  getOriginKeys,
  getPaymentMethods,
  makePayment,
  submitAdditionalPaymentDetails
}
