const { initPaymentCustomType } = require('./initPaymentCustomType')
const { initInterfaceInteractionCustomType } = require('./initInterfaceInteractionCustomType')
const ctpClientBuilder = require('../src/ctp/ctp')

const ctpClient = ctpClientBuilder.get()

Promise.all([
  initPaymentCustomType(ctpClient),
  initInterfaceInteractionCustomType(ctpClient)
])
