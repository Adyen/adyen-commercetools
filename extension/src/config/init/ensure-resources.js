const { ensurePaymentCustomType } = require('./ensure-payment-custom-type')
const {
  ensureInterfaceInteractionCustomType,
} = require('./ensure-interface-interaction-custom-type')
const { ensureApiExtensions } = require('./ensure-api-extensions')
const configLoader = require('../../config/config')

function ensureCustomTypes(ctpClient) {
  return Promise.all([
    ensurePaymentCustomType(ctpClient),
    ensureInterfaceInteractionCustomType(ctpClient),
  ])
}

function ensureResources(ctpClient) {
  const config = configLoader.load()
  if (!config.ensureResources) return Promise.resolve()
  return Promise.all([
    ensureCustomTypes(ctpClient),
    ensureApiExtensions(ctpClient, config.apiExtensionBaseUrl),
  ])
}

module.exports = {
  ensureResources,
}
