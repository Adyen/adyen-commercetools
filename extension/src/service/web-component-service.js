const fetch = require('node-fetch')
const { serializeError } = require('serialize-error')
const config = require('../config/config')
const packageJson = require('../../package.json')

function getPaymentMethods(merchantAccount, getPaymentMethodsRequestObj) {
  const adyenCredentials = config.getAdyenCredentials(merchantAccount)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/paymentMethods`,
    extendRequestObjWithApplicationInfo(getPaymentMethodsRequestObj)
  )
}

function makePayment(merchantAccount, makePaymentRequestObj) {
  const adyenCredentials = config.getAdyenCredentials(merchantAccount)
  return callAdyen(
    `${adyenCredentials}/payments`,
    extendRequestObjWithApplicationInfo(makePaymentRequestObj)
  )
}

function submitAdditionalPaymentDetails(
  merchantAccount,
  submitAdditionalPaymentDetailsRequestObj
) {
  const adyenCredentials = config.getAdyenCredentials(merchantAccount)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/payments/details`,
    extendRequestObjWithApplicationInfo(
      submitAdditionalPaymentDetailsRequestObj
    )
  )
}

function manualCapture(merchantAccount, manualCaptureRequestObj) {
  const adyenCredentials = config.getAdyenCredentials(merchantAccount)
  return callAdyen(
    `${adyenCredentials.legacyApiBaseUrl}/capture`,
    manualCaptureRequestObj
  )
}

function cancelPayment(merchantAccount, cancelRequestObj) {
  const adyenCredentials = config.getAdyenCredentials(merchantAccount)
  return callAdyen(
    `${adyenCredentials.legacyApiBaseUrl}/cancel`,
    cancelRequestObj
  )
}

function refund(merchantAccount, refundRequestObj) {
  const adyenCredentials = config.getAdyenCredentials(merchantAccount)
  return callAdyen(
    `${adyenCredentials.legacyApiBaseUrl}/refund`,
    refundRequestObj
  )
}

function extendRequestObjWithApplicationInfo(requestObj) {
  requestObj.applicationInfo = {
    merchantApplication: {
      name: packageJson.name,
      version: packageJson.version,
    },
    externalPlatform: {
      name: 'commercetools',
      integrator: packageJson.author.name,
    },
  }
  return requestObj
}

async function callAdyen(url, request) {
  let response
  try {
    response = await fetchAsync(url, request)
  } catch (err) {
    response = serializeError(err)
  }
  return { request, response }
}

async function fetchAsync(url, requestObj) {
  const request = buildRequest(requestObj)
  const response = await fetch(url, request)
  const responseBody = await response.json()
  // strip away sensitive data from the adyen response.
  delete responseBody.additionalData
  return responseBody
}

function buildRequest(requestObj) {
  // Note: ensure the merchantAccount is set with request, otherwise set.
  // `makePaymentRequest` custom field will have the value in payload but the value
  // also needed in the `cancel` and `capture` payment handler,
  // because the request will be added as a commercetools transaction.
  if (!requestObj.merchantAccount)
    requestObj.merchantAccount = config.adyen.merchantAccount

  return {
    method: 'POST',
    body: JSON.stringify(requestObj),
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': config.adyen.apiKey,
    },
  }
}

module.exports = {
  getPaymentMethods,
  makePayment,
  submitAdditionalPaymentDetails,
  manualCapture,
  refund,
  cancelPayment,
}
