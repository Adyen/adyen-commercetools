const fetch = require('node-fetch')
const { serializeError } = require('serialize-error')
const configLoader = require('../config/config')

const config = configLoader.load()

function getOriginKeys (getOriginKeysRequestObj) {
  return callAdyen(`${config.adyen.apiBaseUrl}/originKeys`, getOriginKeysRequestObj)
}

function getPaymentMethods (getPaymentMethodsRequestObj) {
  return callAdyen(`${config.adyen.apiBaseUrl}/paymentMethods`, getPaymentMethodsRequestObj)
}

function makePayment (makePaymentRequestObj) {
  return callAdyen(`${config.adyen.apiBaseUrl}/payments`, makePaymentRequestObj)
}

function submitAdditionalPaymentDetails (submitAdditionalPaymentDetailsRequestObj) {
  return callAdyen(`${config.adyen.apiBaseUrl}/payments/details`, submitAdditionalPaymentDetailsRequestObj)
}

function cancelOrRefund (cancelOrRefundRequestObj) {
  return callAdyen(`${config.adyen.legacyApiBaseUrl}/cancelOrRefund`, cancelOrRefundRequestObj)
}

function manualCapture (manualCaptureRequestObj) {
  return callAdyen(`${config.adyen.legacyApiBaseUrl}/capture`, manualCaptureRequestObj)
}

async function callAdyen (url, request) {
  let response
  try {
    response = await fetchAsync(url, request)
  } catch (err) {
    response = serializeError(err)
  }
  return { request, response }
}

async function fetchAsync (url, requestObj) {
  const request = buildRequest(requestObj)
  const response = await fetch(url, request)
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
  submitAdditionalPaymentDetails,
  cancelOrRefund,
  manualCapture
}
