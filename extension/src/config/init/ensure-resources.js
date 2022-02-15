import ensureCustomType from './ensure-custom-type'
import ensureApiExtensions from './ensure-api-extensions'

const { ensurePaymentCustomType, ensureInterfaceInteractionCustomType } =
  ensureCustomType

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

export default { ensureResources }
