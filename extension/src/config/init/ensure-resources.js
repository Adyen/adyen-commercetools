const { ensurePaymentCustomType } = require('./ensure-payment-custom-type')
const {
  ensureInterfaceInteractionCustomType,
} = require('./ensure-interface-interaction-custom-type')
const { ensureApiExtensions } = require('./ensure-api-extensions')

function ensureCustomTypes(ctpClient) {
  return Promise.all([
    ensurePaymentCustomType(ctpClient),
    ensureInterfaceInteractionCustomType(ctpClient),
  ])
}

function ensureResources(ctpClient, apiExtensionBaseUrl) {
  return Promise.all([
    ensureCustomTypes(ctpClient),
    ensureApiExtensions(ctpClient, apiExtensionBaseUrl),
  ])
}

module.exports = {
  ensureResources,
}
