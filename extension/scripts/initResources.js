const { initPaymentCustomType } = require('./initPaymentCustomType')
const { initInterfaceInteractionCustomType } = require('./initInterfaceInteractionCustomType')
const { initApiExtensions } = require('./initApiExtensions')
const ctpClientBuilder = require('../src/ctp/ctp')
const config = require('../src/config/config')

const ctpClient = ctpClientBuilder.get()

Promise.all([
  initPaymentCustomType(ctpClient),
  initInterfaceInteractionCustomType(ctpClient),
  initApiExtensions(ctpClient, config.load().apiExtensionBaseUrl)
])
