import fetch from 'node-fetch'
import { serializeError } from 'serialize-error'
import config from '../../src/config/config.js'

function buildRequest(adyenMerchantAccount, adyenApiKey, requestObj, headers) {
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
      ...headers,
    },
  }
}

async function fetchAsync(
  url,
  adyenMerchantAccount,
  adyenApiKey,
  requestObj,
  headers
) {
  const moduleConfig = config.getModuleConfig()
  const removeSensitiveData =
    requestObj.removeSensitiveData ?? moduleConfig.removeSensitiveData
  delete requestObj.removeSensitiveData
  const request = buildRequest(
    adyenMerchantAccount,
    adyenApiKey,
    requestObj,
    headers
  )
  const response = await fetch(url, request)
  const responseBody = await response.json()
  // strip away sensitive data from the adyen response.
  // request.headers['X-Api-Key'] = '***'
  if (removeSensitiveData) {
    delete responseBody.additionalData
  }
  return { response: responseBody, request }
}

// TODO : It is used to make direct API call to Adyen. Remove it once create session is available in payment
async function callAdyen(
  url,
  adyenMerchantAccount,
  adyenApiKey,
  requestArg,
  headers
) {
  let returnedRequest
  let returnedResponse
  try {
    const { response, request } = await fetchAsync(
      url,
      adyenMerchantAccount,
      adyenApiKey,
      requestArg,
      headers
    )
    returnedRequest = request
    returnedResponse = response
  } catch (err) {
    returnedRequest = { body: JSON.stringify(requestArg) }
    returnedResponse = serializeError(err)
  }
  return { request: returnedRequest, response: returnedResponse }
}

export { callAdyen }
