const fetch = require('node-fetch')
const { serializeError } = require('serialize-error')

const configLoader = require('../config/config')
const config = configLoader.load()

function getOriginKeys (getOriginKeysRequest) {
  return callAdyen('originKeys', getOriginKeysRequest)
}

function getPaymentMethods (getPaymentMethodsRequest) {
  return callAdyen('paymentMethods', getPaymentMethodsRequest)
}

async function callAdyen(endpoint, requestString) {
  let request, response
  try {
    request = buildRequest(requestString)
    response = await fetchAsync(endpoint, request)
  } catch (err) {
    response = serializeError(err)
  }
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

async function fetchAsync (endpoint, request) {
  const response = await fetch(`${config.adyen.apiBaseUrl}/${endpoint}`, request)
  return await response.json();
}

module.exports = {
  getOriginKeys,
  getPaymentMethods
}
