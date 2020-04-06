const fetch = require('node-fetch')
const { serializeError } = require('serialize-error')

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
  const request = buildRequest(requestString)
  const response = await fetchAsync(endpoint, request)
  return { request, response }
}

async function fetchAsync (endpoint, request) {
  try {
    const response = await fetch(`${config.adyen.apiBaseUrl}/${endpoint}`, request)
    return await response.json();
  } catch (err) {
    return serializeError(err);
  }
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
