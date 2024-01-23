import {
  ensurePaymentCustomType,
  ensureInterfaceInteractionCustomType,
  ensureTransactionCustomType,
} from './ensure-custom-type.js'
import { ensureApiExtensions } from './ensure-api-extensions.js'

function ensureCustomTypes(ctpClient, ctpProjectKey) {
  return Promise.all([
    ensurePaymentCustomType(ctpClient, ctpProjectKey),
    ensureInterfaceInteractionCustomType(ctpClient, ctpProjectKey),
    ensureTransactionCustomType(ctpClient, ctpProjectKey),
  ])
}

function ensureResources(
  ctpClient,
  ctpProjectKey,
  apiExtensionBaseUrl,
  authHeaderValue,
) {
  return Promise.all([
    ensureCustomTypes(ctpClient, ctpProjectKey),
    ensureApiExtensions(
      ctpClient,
      ctpProjectKey,
      apiExtensionBaseUrl,
      authHeaderValue,
    ),
  ])
}

export { ensureResources }
