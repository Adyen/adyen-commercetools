const { createLineItems } = require('../service/klarna-service')
const ctpClientBuilder = require('../ctp/ctp-client')
const makePaymentHandler = require('./make-payment.handler')

async function execute (paymentObject) {
  const ctpCart = await _fetchMatchingCart(paymentObject)
  if (ctpCart) {
    const makePaymentRequestObj = JSON.parse(paymentObject.custom.fields.makePaymentRequest)
    makePaymentRequestObj.lineItems = createLineItems(paymentObject, ctpCart)
  }

  return makePaymentHandler.execute(paymentObject)
}

async function _fetchMatchingCart (paymentObject) {
  const ctpClient = ctpClientBuilder.get()
  const { body } = await ctpClient.fetch(ctpClient.builder.carts
    .where(`paymentInfo(payments(id="${paymentObject.id}"))`)
    .expand('shippingInfo.shippingMethod'))
  return body.results[0]
}


module.exports = { execute }
