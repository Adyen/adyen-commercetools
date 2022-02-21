import ensureCustomType from './ensure-custom-type.js'
import apiExtensions from './ensure-api-extensions.js'

const { ensurePaymentCustomType, ensureInterfaceInteractionCustomType } = ensureCustomType
const { ensureApiExtensions } = apiExtensions

function ensureCustomTypes(ctpClient, ctpProjectKey) {
  return Promise.all([
    ensurePaymentCustomType(ctpClient, ctpProjectKey),
    ensureInterfaceInteractionCustomType(ctpClient, ctpProjectKey),
  ])
}

function ensureResources(
  ctpClient,
  ctpProjectKey,
  apiExtensionBaseUrl,
  authHeaderValue
) {
  return Promise.all([
    ensureCustomTypes(ctpClient, ctpProjectKey),
    ensureApiExtensions(
      ctpClient,
      ctpProjectKey,
      apiExtensionBaseUrl,
      authHeaderValue
    ),
  ])
}

export default {
  ensureResources,
}
