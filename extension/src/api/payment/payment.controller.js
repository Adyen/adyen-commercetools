const httpUtils = require('../../utils')
const creditCardMakePayment = require('../../paymentHandler/creditCard/creditCardMakePayment.handler')
const creditCardCompletePayment = require('../../paymentHandler/creditCard/creditCardCompletePayment.handler')
const paypalMakePayment = require('../../paymentHandler/paypal/paypalMakePayment.handler')
const paypalCompletePayment = require('../../paymentHandler/paypal/paypalCompletePayment.handler')
const kcpMakePayment = require('../../paymentHandler/kcp/kcpMakePayment.handler')
const commonHandler = require('../../paymentHandler/fetchPaymentMethod.handler')

const paymentHandlers = [creditCardMakePayment, creditCardCompletePayment, commonHandler,
  paypalMakePayment, paypalCompletePayment, kcpMakePayment]

async function handlePayment (request, response) {
  const paymentObject = await _getPaymentObject(request)
  const handler = _getPaymentHandler(paymentObject)

  const handlerResponse = await handler.handlePayment(paymentObject)
  return httpUtils.sendResponse(response, undefined, undefined, handlerResponse)
}

async function _getPaymentObject (request) {
  const requestBody = JSON.parse(await httpUtils.collectRequestData(request))
  return requestBody.resource.obj
}

function _getPaymentHandler (paymentObject) {
  for (const paymentHandler of paymentHandlers)
    if (paymentHandler.isSupported(paymentObject))
      return paymentHandler
  throw new Error('Payment is not supported.')
}

module.exports = { handlePayment }
