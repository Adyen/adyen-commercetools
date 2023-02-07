import fetch from 'node-fetch'
import { serializeError } from 'serialize-error'
import config from '../config/config.js'
import utils from '../utils.js'
import constants from '../config/constants.js'

async function makePayment(
  merchantAccount,
  commercetoolsProjectKey,
  makePaymentRequestObj
) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  extendRequestObjWithMetadata(makePaymentRequestObj, commercetoolsProjectKey)
  await extendRequestObjWithApplicationInfo(makePaymentRequestObj)
  removeAddCommercetoolsLineItemsField(makePaymentRequestObj)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/payments`,
    merchantAccount,
    adyenCredentials.apiKey,
    makePaymentRequestObj
  )
}

function removeAddCommercetoolsLineItemsField(makePaymentRequestObj) {
  // Otherwise adyen might return a 400 response with the following message:
  // Structure of PaymentRequest contains the following unknown fields: [addCommercetoolsLineItems]
  delete makePaymentRequestObj.addCommercetoolsLineItems
}

function submitAdditionalPaymentDetails(
  merchantAccount,
  commercetoolsProjectKey,
  submitAdditionalPaymentDetailsRequestObj
) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  extendRequestObjWithMetadata(
    submitAdditionalPaymentDetailsRequestObj,
    commercetoolsProjectKey
  )
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/payments/details`,
    merchantAccount,
    adyenCredentials.apiKey,
    submitAdditionalPaymentDetailsRequestObj
  )
}

function manualCapture(
  merchantAccount,
  commercetoolsProjectKey,
  idempotencyKey,
  manualCaptureRequestObj
) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  extendRequestObjWithMetadata(manualCaptureRequestObj, commercetoolsProjectKey)
  return callAdyen(
    `${adyenCredentials.legacyApiBaseUrl}/Payment/${constants.ADYEN_LEGACY_API_VERSION.MANUAL_CAPTURE}/capture`,
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
    `${adyenCredentials.legacyApiBaseUrl}/Payment/${constants.ADYEN_LEGACY_API_VERSION.CANCEL}/cancel`,
    merchantAccount,
    adyenCredentials.apiKey,
    cancelPaymentRequestObj
  )
}

function refund(
  merchantAccount,
  commercetoolsProjectKey,
  idempotencyKey,
  refundRequestObj
) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  extendRequestObjWithMetadata(refundRequestObj, commercetoolsProjectKey)
  return callAdyen(
    `${adyenCredentials.legacyApiBaseUrl}/Payment/${constants.ADYEN_LEGACY_API_VERSION.REFUND}/refund`,
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

function createSessionRequest(
  merchantAccount,
  commercetoolsProjectKey,
  requestObject
) {
  extendRequestObjWithMetadata(requestObject, commercetoolsProjectKey)
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/sessions`,
    merchantAccount,
    adyenCredentials.apiKey,
    requestObject
  )
}

function disableStoredPayment(merchantAccount, disableStoredPaymentRequestObj) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  const url =
    `${adyenCredentials.legacyApiBaseUrl}/Recurring/` +
    `${constants.ADYEN_LEGACY_API_VERSION.DISABLED_STORED_PAYMENT}/disable`
  return callAdyen(
    url,
    merchantAccount,
    adyenCredentials.apiKey,
    disableStoredPaymentRequestObj
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
  let response
  let responseBody
  let responseBodyInText
  const request = buildRequest(
    adyenMerchantAccount,
    adyenApiKey,
    requestObj,
    headers
  )

  try {
    response = await fetch(url, request)
    responseBodyInText = await response.text()

    responseBody = JSON.parse(responseBodyInText)
  } catch (err) {
    if (response)
      // Handle non-JSON format response
      throw new Error(
        `Unable to receive non-JSON format resposne from Adyen API : ${responseBodyInText}`
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

export {
  makePayment,
  submitAdditionalPaymentDetails,
  manualCapture,
  refund,
  cancelPayment,
  getCarbonOffsetCosts,
  updateAmount,
  disableStoredPayment,
  createSessionRequest,
}
