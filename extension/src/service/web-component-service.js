import fetch from 'node-fetch'
import { serializeError } from 'serialize-error'
import config from '../config/config.js'
import packageJson from '../../package.json'

function getPaymentMethods(merchantAccount, getPaymentMethodsRequestObj) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  return callAdyen(
    `${adyenCredentials.apiBaseUrl}/paymentMethods`,
    merchantAccount,
    adyenCredentials.apiKey,
    extendRequestObjWithApplicationInfo(getPaymentMethodsRequestObj)
  )
}

function makePayment(
  merchantAccount,
  commercetoolsProjectKey,
  makePaymentRequestObj
) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  extendRequestObjWithMetadata(makePaymentRequestObj, commercetoolsProjectKey)
  extendRequestObjWithApplicationInfo(makePaymentRequestObj)
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
  manualCaptureRequestObj
) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  extendRequestObjWithMetadata(manualCaptureRequestObj, commercetoolsProjectKey)
  return callAdyen(
    `${adyenCredentials.legacyApiBaseUrl}/capture`,
    merchantAccount,
    adyenCredentials.apiKey,
    manualCaptureRequestObj
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
    `${adyenCredentials.legacyApiBaseUrl}/cancel`,
    merchantAccount,
    adyenCredentials.apiKey,
    cancelPaymentRequestObj
  )
}

function refund(merchantAccount, commercetoolsProjectKey, refundRequestObj) {
  const adyenCredentials = config.getAdyenConfig(merchantAccount)
  extendRequestObjWithMetadata(refundRequestObj, commercetoolsProjectKey)
  return callAdyen(
    `${adyenCredentials.legacyApiBaseUrl}/refund`,
    merchantAccount,
    adyenCredentials.apiKey,
    refundRequestObj
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
  const moduleConfig = config.getModuleConfig()
  if (moduleConfig.removeSensitiveData) {
    delete responseBody.additionalData
  }
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

export {
  getPaymentMethods,
  makePayment,
  submitAdditionalPaymentDetails,
  manualCapture,
  refund,
  cancelPayment,
  getCarbonOffsetCosts,
}
