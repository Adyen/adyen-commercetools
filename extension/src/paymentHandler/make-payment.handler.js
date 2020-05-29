const { makePayment } = require('../service/web-component-service')
const { createLineItems } = require('../service/klarna-service')
const pU = require('./payment-utils')
const c = require('../config/constants')
const ctpClientBuilder = require('../ctp/ctp-client')

async function execute (paymentObject) {
  const makePaymentRequestObj = JSON.parse(paymentObject.custom.fields.makePaymentRequest)
  if (_isKlarna(makePaymentRequestObj) && !makePaymentRequestObj.lineItems) {
    const ctpCart = await _fetchMatchingCart(paymentObject)
    if (ctpCart)
      makePaymentRequestObj.lineItems = createLineItems(paymentObject, ctpCart)
  }

  const { request, response } = await makePayment(makePaymentRequestObj)
  const actions = [
    pU.createAddInterfaceInteractionAction({
      request, response, type: c.CTP_INTERACTION_TYPE_MAKE_PAYMENT
    }),
    pU.createSetCustomFieldAction(c.CTP_CUSTOM_FIELD_MAKE_PAYMENT_RESPONSE, response)
  ]

  const addTransactionAction = pU.createAddTransactionActionByResponse(
    paymentObject.amountPlanned.centAmount,
    paymentObject.amountPlanned.currencyCode,
    response
  )

  if (addTransactionAction)
    actions.push(addTransactionAction)

  return {
    actions
  }
}

async function _fetchMatchingCart (paymentObject) {
  const ctpClient = ctpClientBuilder.get()
  const { body } = await ctpClient.fetch(ctpClient.builder.carts
    .where(`paymentInfo(payments(id="${paymentObject.id}"))`)
    .expand('shippingInfo.shippingMethod'))
  return body.results[0]
}

function _isKlarna (makePaymentRequestObj) {
  return c.PAYMENT_METHOD_TYPE_KLARNA_METHODS.includes(makePaymentRequestObj.paymentMethod.type)
}

module.exports = { execute }
