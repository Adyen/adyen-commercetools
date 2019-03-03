const httpUtils = require('../../utils')
const creditCardPayment = require('../../paymentHandler/creditCard/creditCard.handler')
const paypalPayment = require('../../paymentHandler/paypal/paypal.handler')
const kcpPayment = require('../../paymentHandler/kcp/kcpPayment.handler')
const commonHandler = require('../../paymentHandler/fetchPaymentMethod.handler')
const ValidatorBuilder = require('../../validator/validatorBuilder')

const paymentHandlers = {
  creditCardPayment,
  commonHandler,
  paypalPayment,
  kcpPayment
}

async function processRequest (request, response) {
  const paymentObject = await _getPaymentObject(request)
  const adyenValidator = ValidatorBuilder.withPayment(paymentObject)
    .validateAdyen()
  if (adyenValidator.hasErrors())
    // if it's not adyen payment, ignore the payment
    return httpUtils.sendResponse(response)
  const interfaceIdValidator = ValidatorBuilder.withPayment(paymentObject)
    .validateInterfaceIdField()
  if (interfaceIdValidator.hasErrors())
    return httpUtils.sendResponse(response, 400, undefined,
      interfaceIdValidator.buildCtpErrorResponse())
  const handler = _getPaymentHandler(paymentObject)
  const handlerResponse = await handler.handlePayment(paymentObject)
  if (handlerResponse.errors)
    return httpUtils.sendResponse(response, 400, undefined, handlerResponse)
  return httpUtils.sendResponse(response, undefined, undefined, handlerResponse)
}

async function _getPaymentObject (request) {
  const requestBody = JSON.parse(await httpUtils.collectRequestData(request))
  return requestBody.resource.obj
}

function _getPaymentHandler (paymentObject) {
  const paymentValidator = ValidatorBuilder.withPayment(paymentObject)
  if (paymentValidator.isPaypal())
    return paymentHandlers.paypalPayment
  if (paymentValidator.isCreditCard())
    return paymentHandlers.creditCardPayment
  if (paymentValidator.isKcp())
    return paymentHandlers.kcpPayment
  return paymentHandlers.commonHandler
}

module.exports = { processRequest }
