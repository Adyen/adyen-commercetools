const { ensurePaymentCustomType } = require('./ensure-payment-custom-type')
const { ensureInterfaceInteractionCustomType } = require('./ensure-interface-interaction-custom-type')
const { ensureApiExtensions } = require('./ensure-api-extensions')
const ctpClientBuilder = require('../../ctp/ctp-client')
const configLoader = require('../../config/config')

const config = configLoader.load()
const ctpClient = ctpClientBuilder.get()

function ensureCustomTypes () {
  return Promise.all([
    ensurePaymentCustomType(ctpClient),
    ensureInterfaceInteractionCustomType(ctpClient)
  ])
}

function ensureResources () {
  if (config.disableEnsureResources) return Promise.resolve()
  return Promise.all([
    ensureCustomTypes(),
    ensureApiExtensions(ctpClient, config.apiExtensionBaseUrl)
  ])
}

module.exports = {
  ensureResources,
  ensureCustomTypes
}
