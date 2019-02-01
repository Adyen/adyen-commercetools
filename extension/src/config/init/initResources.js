const { initPaymentCustomType } = require('./initPaymentCustomType')
const { initInterfaceInteractionCustomType } = require('./initInterfaceInteractionCustomType')
const { initApiExtensions } = require('./initApiExtensions')
const ctpClientBuilder = require('../../ctp/ctp')
const config = require('../../config/config')


function initResources () {
  const ctpClient = ctpClientBuilder.get()
  return Promise.all([
    initPaymentCustomType(ctpClient),
    initInterfaceInteractionCustomType(ctpClient),
    initApiExtensions(ctpClient, config.load().apiExtensionBaseUrl)
  ])
}

module.exports = {
  initResources
}
