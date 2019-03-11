const { initPaymentCustomType } = require('./init-payment-custom-type')
const { initInterfaceInteractionCustomType } = require('./init-interface-interaction-custom-type')
const { initApiExtensions } = require('./init-api-extensions')
const ctpClientBuilder = require('../../ctp/ctp-client')
const config = require('../../config/config')


function initResources () {
  const ctpClient = ctpClientBuilder.get()
  // todo: make ensure instead of init
  return Promise.all([
    initPaymentCustomType(ctpClient),
    initInterfaceInteractionCustomType(ctpClient),
    initApiExtensions(ctpClient, config.load().apiExtensionBaseUrl)
  ])
}

module.exports = {
  initResources
}
