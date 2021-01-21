const fetch = require('node-fetch')
const { serializeError } = require('serialize-error')
const config = require('../config/config')
const packageJson = require('../../package.json')

function getPaymentMethods(merchantAccount, getPaymentMethodsRequestObj) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/paymentMethods`,
    merchantAccount,
    adyenCredentials.apiKey,
    extendRequestObjWithApplicationInfo(getPaymentMethodsRequestObj)
  )
}

function makePayment(merchantAccount, makePaymentRequestObj) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/payments`,
    merchantAccount,
    adyenCredentials.apiKey,
    extendRequestObjWithApplicationInfo(makePaymentRequestObj)
  )
}

function submitAdditionalPaymentDetails(
  merchantAccount,
  submitAdditionalPaymentDetailsRequestObj
) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/payments/details`,
    merchantAccount,
    adyenCredentials.apiKey,
    extendRequestObjWithApplicationInfo(
      submitAdditionalPaymentDetailsRequestObj
    )
  )
}

function manualCapture(merchantAccount, manualCaptureRequestObj) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  return callAdyen(
    `${adyenCredentials.legacyApiBaseUrl}/capture`,
    merchantAccount,
    adyenCredentials.apiKey,
    manualCaptureRequestObj
  )
}

function cancelPayment(merchantAccount, cancelRequestObj) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  return callAdyen(
    `${adyenCredentials.legacyApiBaseUrl}/cancel`,
    merchantAccount,
    adyenCredentials.apiKey,
    cancelRequestObj
  )
}

function refund(merchantAccount, refundRequestObj) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  return callAdyen(
    `${adyenCredentials.legacyApiBaseUrl}/refund`,
    merchantAccount,
    adyenCredentials.apiKey,
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

async function callAdyen(url, adyenMerchantAccount, adyenApiKey, request) {
  let response
  try {
    response = await fetchAsync(url, adyenMerchantAccount, adyenApiKey, request)
  } catch (err) {
    response = serializeError(err)
  }
  return { request, response }
}

async function fetchAsync(url, adyenMerchantAccount, adyenApiKey, requestObj) {
  const request = buildRequest(adyenMerchantAccount, adyenApiKey, requestObj)
  const response = await fetch(url, request)
  const responseBody = await response.json()
  // strip away sensitive data from the adyen response.
  delete responseBody.additionalData
  return responseBody
}

function buildRequest(adyenMerchantAccount, adyenApiKey, requestObj) {
  // Note: ensure the merchantAccount is set with request, otherwise set
  // it with the value from adyenMerchantAccount payment custom field
  if (!requestObj.merchantAccount)
    requestObj.merchantAccount = adyenMerchantAccount

  return {
    method: 'POST',
    body: JSON.stringify(requestObj),
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': adyenApiKey,
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
