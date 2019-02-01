const httpUtils = require('../../utils')
const creditCardHandler = require('../../paymentHandler/creditCard/creditCard.handler')
const commonHandler = require('../../paymentHandler/fetchPaymentMethod.handler')

const paymentHandlers = [creditCardHandler, commonHandler]

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
