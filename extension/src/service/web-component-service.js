import fetch from 'node-fetch'
import { serializeError } from 'serialize-error'
import config from '../config/config.js'
import utils from '../utils.js'

async function getPaymentMethods(merchantAccount, getPaymentMethodsRequestObj) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/paymentMethods`,
    merchantAccount,
    adyenCredentials.apiKey,
    await extendRequestObjWithApplicationInfo(getPaymentMethodsRequestObj)
  )
}

function removeAddCommercetoolsLineItemsField(createSessionRequestObj) {
  // Otherwise adyen might return a 400 response with the following message:
  // Structure of PaymentRequest contains the following unknown fields: [addCommercetoolsLineItems]
  delete createSessionRequestObj.addCommercetoolsLineItems
}

function manualCapture(
  merchantAccount,
  commercetoolsProjectKey,
  idempotencyKey,
  paymentReference,
  manualCaptureRequestObj
) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  extendRequestObjWithMetadata(manualCaptureRequestObj, commercetoolsProjectKey)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/payments/${paymentReference}/captures`,
    merchantAccount,
    adyenCredentials.apiKey,
    manualCaptureRequestObj,
    idempotencyKey && { 'Idempotency-Key': idempotencyKey }
  )
}

function cancelPayment(
  merchantAccount,
  commercetoolsProjectKey,
  cancelPaymentRequestObj
) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  extendRequestObjWithMetadata(cancelPaymentRequestObj)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/cancels`,
    merchantAccount,
    adyenCredentials.apiKey,
    cancelPaymentRequestObj
  )
}

function refund(
  merchantAccount,
  commercetoolsProjectKey,
  idempotencyKey,
  pspReference,
  refundRequestObj
) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  extendRequestObjWithMetadata(refundRequestObj, commercetoolsProjectKey)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/payments/${pspReference}/refunds`,
    merchantAccount,
    adyenCredentials.apiKey,
    refundRequestObj,
    idempotencyKey && { 'Idempotency-Key': idempotencyKey }
  )
}

function getCarbonOffsetCosts(merchantAccount, getCarbonOffsetCostsRequestObj) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/carbonOffsetCosts`,
    merchantAccount,
    adyenCredentials.apiKey,
    getCarbonOffsetCostsRequestObj
  )
}

function updateAmount(
  merchantAccount,
  commercetoolsProjectKey,
  amountUpdatesRequestObj
) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  const paymentPspReference = amountUpdatesRequestObj.paymentPspReference
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/payments/${paymentPspReference}/amountUpdates`,
    merchantAccount,
    adyenCredentials.apiKey,
    amountUpdatesRequestObj
  )
}

async function createSessionRequest(
  merchantAccount,
  commercetoolsProjectKey,
  requestObject
) {
  extendRequestObjWithMetadata(requestObject, commercetoolsProjectKey)
  await extendRequestObjWithApplicationInfo(requestObject)
  removeAddCommercetoolsLineItemsField(requestObject)
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/sessions`,
    merchantAccount,
    adyenCredentials.apiKey,
    requestObject
  )
}

function disableStoredPayment(
  merchantAccount,
  storedPaymentMethodId,
  disableStoredPaymentRequestObj
) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  const url = `${adyenCredentials.apiBaseUrl}/storedPaymentMethods/${storedPaymentMethodId}`
  return callAdyen(
    url,
    merchantAccount,
    adyenCredentials.apiKey,
    disableStoredPaymentRequestObj,
    'DELETE'
  )
}

async function extendRequestObjWithApplicationInfo(requestObj) {
  const packageJson = await utils.readAndParseJsonFile('package.json')
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

function extendRequestObjWithMetadata(requestObj, commercetoolsProjectKey) {
  if (requestObj.metadata) {
    requestObj.metadata = {
      ...requestObj.metadata,
      ctProjectKey: commercetoolsProjectKey,
    }
  } else {
    requestObj.metadata = {
      // metadata key must have length of max. 20 chars
      // metadata value must have length of max. 80 chars
      ctProjectKey: commercetoolsProjectKey,
    }
  }
}

async function callAdyen(
  url,
  adyenMerchantAccount,
  adyenApiKey,
  requestArg,
  headers,
  methodOverride
) {
  let returnedRequest
  let returnedResponse
  try {
    const { response, request } = await fetchAsync(
      url,
      adyenMerchantAccount,
      adyenApiKey,
      requestArg,
      headers,
      methodOverride
    )
    returnedRequest = request
    returnedResponse = response
  } catch (err) {
    returnedRequest = { body: JSON.stringify(requestArg) }
    returnedResponse = serializeError(err)
  }

  return { request: returnedRequest, response: returnedResponse }
}

async function fetchAsync(
  url,
  adyenMerchantAccount,
  adyenApiKey,
  requestObj,
  headers,
  methodOverride
) {
  const moduleConfig = config.getModuleConfig()
  const removeSensitiveData =
    requestObj.removeSensitiveData ?? moduleConfig.removeSensitiveData
  delete requestObj.removeSensitiveData
  let response
  let responseBody
  let responseBodyInText
  const request = buildRequest(
    adyenMerchantAccount,
    adyenApiKey,
    requestObj,
    headers,
    methodOverride
  )

  try {
    response = await fetch(url, request)
    responseBodyInText = await response.text()

    responseBody = JSON.parse(responseBodyInText)
  } catch (err) {
    if (response)
      // Handle non-JSON format response
      throw new Error(
        `Unable to receive non-JSON format response from Adyen API : ${responseBodyInText}`
      )
    // Error in fetching URL
    else throw err
  } finally {
    // strip away sensitive data from the adyen response.
    request.headers['X-Api-Key'] = '***'
    if (removeSensitiveData && responseBody) {
      delete responseBody.additionalData
    }
  }
  return { response: responseBody, request }
}

function buildRequest(
  adyenMerchantAccount,
  adyenApiKey,
  requestObj,
  headers,
  methodOverride
) {
  // Note: ensure the merchantAccount is set with request, otherwise set
  // it with the value from adyenMerchantAccount payment custom field
  if (!requestObj.merchantAccount)
    requestObj.merchantAccount = adyenMerchantAccount

  const requestHeaders = {
    'Content-Type': 'application/json',
    'X-Api-Key': adyenApiKey,
    ...headers,
  }

  if (methodOverride === 'DELETE') {
    return {
      method: methodOverride,
      headers: requestHeaders,
      body: new URLSearchParams(requestObj),
    }
  }

  return {
    method: methodOverride || 'POST',
    body: JSON.stringify(requestObj),
    headers: requestHeaders,
  }
}

export {
  getPaymentMethods,
  manualCapture,
  refund,
  cancelPayment,
  getCarbonOffsetCosts,
  updateAmount,
  disableStoredPayment,
  createSessionRequest,
}
