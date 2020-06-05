const { createLineItems } = require('../service/klarna-service')
const ctpClientBuilder = require('../ctp/ctp-client')
const makePaymentHandler = require('./make-payment.handler')

async function execute (paymentObject) {
  const makePaymentRequestObj = JSON.parse(paymentObject.custom.fields.makePaymentRequest)
  if (!makePaymentRequestObj.lineItems) {
    const ctpCart = await _fetchMatchingCart(paymentObject)
    if (ctpCart) {
      makePaymentRequestObj.lineItems = createLineItems(paymentObject, ctpCart)
      paymentObject.custom.fields.makePaymentRequest = JSON.stringify(makePaymentRequestObj)
    }
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
