const { ensurePaymentCustomType } = require('./ensure-payment-custom-type')
const { ensureInterfaceInteractionCustomType } = require('./ensure-interface-interaction-custom-type')
const { ensureApiExtensions } = require('./ensure-api-extensions')
const ctpClientBuilder = require('../../ctp/ctp-client')
const config = require('../../config/config')

const ctpClient = ctpClientBuilder.get()

function ensureCustomTypes () {
  return Promise.all([
    ensurePaymentCustomType(ctpClient),
    ensureInterfaceInteractionCustomType(ctpClient)
  ])
}

function ensureResources () {
  return Promise.all([
    ensureCustomTypes(),
    ensureApiExtensions(ctpClient, config.load().apiExtensionBaseUrl)
  ])
}

module.exports = {
  ensureResources,
  ensureCustomTypes
}
