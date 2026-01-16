import fetch from 'node-fetch'
import { serializeError } from 'serialize-error'
import config from '../config/config.js'
import utils from '../utils.js'

async function getPaymentMethods(merchantAccount, getPaymentMethodsRequestObj, idempotencyKey) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/paymentMethods`,
    merchantAccount,
    adyenCredentials.apiKey,
    await extendRequestObjWithApplicationInfo(getPaymentMethodsRequestObj),
    idempotencyKey && { 'Idempotency-Key': idempotencyKey },
  )
}

async function makePayment(
  merchantAccount,
  commercetoolsProjectKey,
  makePaymentRequestObj,
  idempotencyKey,
) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  extendRequestObjWithMetadata(makePaymentRequestObj, commercetoolsProjectKey)
  await extendRequestObjWithApplicationInfo(makePaymentRequestObj)
  removeAddCommercetoolsLineItemsField(makePaymentRequestObj)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/payments`,
    merchantAccount,
    adyenCredentials.apiKey,
    makePaymentRequestObj,
    idempotencyKey && { 'Idempotency-Key': idempotencyKey },
  )
}

function submitAdditionalPaymentDetails(
  merchantAccount,
  commercetoolsProjectKey,
  submitAdditionalPaymentDetailsRequestObj,
  idempotencyKey,
) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  extendRequestObjWithMetadata(
    submitAdditionalPaymentDetailsRequestObj,
    commercetoolsProjectKey,
  )
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/payments/details`,
    merchantAccount,
    adyenCredentials.apiKey,
    submitAdditionalPaymentDetailsRequestObj,
    idempotencyKey && { 'Idempotency-Key': idempotencyKey },
  )
}

async function donationCampaigns(merchantAccount, donationCampaignsRequest, idempotencyKey) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)

  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/donationCampaigns`,
    merchantAccount,
    adyenCredentials.apiKey,
    donationCampaignsRequest,
    idempotencyKey && { 'Idempotency-Key': idempotencyKey },
  )
}

async function donation(merchantAccount, donationRequest, idempotencyKey) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)

  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/donations`,
    merchantAccount,
    adyenCredentials.apiKey,
    donationRequest,
    idempotencyKey && { 'Idempotency-Key': idempotencyKey },
  )
}

function removeAddCommercetoolsLineItemsField(createSessionRequestObj) {
  // This flag is considered deprecated
  // If createSessionRequestObj contains this flag, it should be deleted
  // Otherwise adyen might return a 400 response with the following message:
  // Structure of PaymentRequest contains the following unknown fields: [addCommercetoolsLineItems]
  delete createSessionRequestObj.addCommercetoolsLineItems
}

function manualCapture(
  merchantAccount,
  commercetoolsProjectKey,
  idempotencyKey,
  manualCaptureRequestObj,
) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/payments/${manualCaptureRequestObj.originalReference}/captures`,
    merchantAccount,
    adyenCredentials.apiKey,
    {
      amount: manualCaptureRequestObj.modificationAmount,
      reference: manualCaptureRequestObj?.reference,
    },
    idempotencyKey && { 'Idempotency-Key': idempotencyKey },
  )
}

function cancelPayment(
  merchantAccount,
  commercetoolsProjectKey,
  idempotencyKey,
  cancelPaymentRequestObj,
) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/payments/${cancelPaymentRequestObj.originalReference}/cancels`,
    merchantAccount,
    adyenCredentials.apiKey,
    {
      reference: cancelPaymentRequestObj?.reference,
    },
    idempotencyKey && { 'Idempotency-Key': idempotencyKey },
  )
}

function refund(
  merchantAccount,
  commercetoolsProjectKey,
  idempotencyKey,
  refundRequestObj,
) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/payments/${refundRequestObj.originalReference}/refunds`,
    merchantAccount,
    adyenCredentials.apiKey,
    {
      amount: refundRequestObj.modificationAmount,
      reference: refundRequestObj?.reference,
    },
    idempotencyKey && { 'Idempotency-Key': idempotencyKey },
  )
}

function getCarbonOffsetCosts(merchantAccount, getCarbonOffsetCostsRequestObj) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/carbonOffsetCosts`,
    merchantAccount,
    adyenCredentials.apiKey,
    getCarbonOffsetCostsRequestObj,
  )
}

function updateAmount(
  merchantAccount,
  commercetoolsProjectKey,
  idempotencyKey,
  amountUpdatesRequestObj,
) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  const paymentPspReference = amountUpdatesRequestObj.paymentPspReference
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/payments/${paymentPspReference}/amountUpdates`,
    merchantAccount,
    adyenCredentials.apiKey,
    amountUpdatesRequestObj,
    idempotencyKey && { 'Idempotency-Key': idempotencyKey },
  )
}

async function createSessionRequest(
  merchantAccount,
  commercetoolsProjectKey,
  requestObject,
  idempotencyKey,
) {
  extendRequestObjWithMetadata(requestObject, commercetoolsProjectKey)
  await extendRequestObjWithApplicationInfo(requestObject)
  removeAddCommercetoolsLineItemsField(requestObject)
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/sessions`,
    merchantAccount,
    adyenCredentials.apiKey,
    requestObject,
    idempotencyKey && { 'Idempotency-Key': idempotencyKey },
  )
}

async function disableStoredPayment(
  merchantAccount,
  disableStoredPaymentRequestObj,
) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)

  const recurringReference =
    disableStoredPaymentRequestObj.recurringDetailReference
  const url = `${adyenCredentials.apiBaseUrl}/storedPaymentMethods/${recurringReference}`
  delete disableStoredPaymentRequestObj.recurringDetailReference

  const result = await callAdyen(
    url,
    merchantAccount,
    adyenCredentials.apiKey,
    disableStoredPaymentRequestObj,
    [],
    'DELETE',
  )

  if (!result.response) {
    result.response = { response: '[detail-successfully-disabled]' }
  }

  return result
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
  methodOverride,
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
      methodOverride,
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
  methodOverride,
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
    methodOverride,
  )

  if (methodOverride === 'DELETE') {
    url += `?${request.body}`
    delete request.body
  }

  try {
    response = await fetch(url, request)
    responseBodyInText = await response.text()

    responseBody = responseBodyInText ? JSON.parse(responseBodyInText) : ''
  } catch (err) {
    if (response)
      // Handle non-JSON format response
      throw new Error(
        `Unable to receive non-JSON format resposne from Adyen API : ${responseBodyInText}`,
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
  methodOverride,
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
  makePayment,
  submitAdditionalPaymentDetails,
  manualCapture,
  refund,
  cancelPayment,
  getCarbonOffsetCosts,
  updateAmount,
  disableStoredPayment,
  createSessionRequest,
  donationCampaigns,
  donation,
}
