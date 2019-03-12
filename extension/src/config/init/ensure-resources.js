const { ensurePaymentCustomType } = require('./ensure-payment-custom-type')
const { ensureInterfaceInteractionCustomType } = require('./ensure-interface-interaction-custom-type')
const { ensureApiExtensions } = require('./ensure-api-extensions')
const ctpClientBuilder = require('../../ctp/ctp-client')
const config = require('../../config/config')


function ensureResources () {
  const ctpClient = ctpClientBuilder.get()
  return Promise.all([
    ensurePaymentCustomType(ctpClient),
    ensureInterfaceInteractionCustomType(ctpClient),
    ensureApiExtensions(ctpClient, config.load().apiExtensionBaseUrl)
  ])
}

module.exports = {
  ensureResources
}
