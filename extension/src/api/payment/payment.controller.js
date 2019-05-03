const serializeError = require('serialize-error')
const httpUtils = require('../../utils')
const creditCardHandler = require('../../paymentHandler/creditCard/credit-card.handler')
const paypalHandler = require('../../paymentHandler/paypal/paypal.handler')
const kcpHandler = require('../../paymentHandler/kcp/kcp-payment.handler')
const fetchPaymentMethodsHandler = require('../../paymentHandler/fetch-payment-methods.handler')
const ValidatorBuilder = require('../../validator/validator-builder')

const paymentHandlers = {
  creditCardHandler,
  fetchPaymentMethodsHandler,
  paypalHandler,
  kcpHandler
}

async function processRequest (request, response) {
  if (request.method !== 'POST')
  // API extensions always calls this endpoint with POST, so if we got GET, we don't process further
  // https://docs.commercetools.com/http-api-projects-api-extensions#input
    return httpUtils.sendResponse({ response })
  const paymentObject = await _getPaymentObject(request)
  const validatorBuilder = ValidatorBuilder.withPayment(paymentObject)
  const adyenValidator = validatorBuilder
    .validateAdyen()
  if (adyenValidator.hasErrors())
  // if it's not adyen payment, ignore the payment
    return httpUtils.sendResponse({ response })
  const interfaceIdValidator = validatorBuilder
    .validateInterfaceIdField()
  if (interfaceIdValidator.hasErrors())
    return httpUtils.sendResponse({
      response,
      statusCode: 400,
      data: interfaceIdValidator.buildCtpErrorResponse()
    })
  const paymentMethodValidator = validatorBuilder.validatePaymentMethod()
  if (paymentMethodValidator.hasErrors())
    return httpUtils.sendResponse({
      response,
      statusCode: 400,
      data: paymentMethodValidator.buildCtpErrorResponse()
    })
  const handler = _getPaymentHandler(paymentObject)
  const handlerResponse = await handler.handlePayment(paymentObject)
  if (handlerResponse.errors)
    return httpUtils.sendResponse({ response, statusCode: 400, data: handlerResponse })
  return httpUtils.sendResponse({ response, statusCode: 200, data: handlerResponse })
}

async function _getPaymentObject (request) {
  const body = await httpUtils.collectRequestData(request)
  try {
    const requestBody = JSON.parse(body)
    return requestBody.resource.obj
  } catch (err) {
    throw new Error(`Error during parsing CTP request: '${body}'. Ending the process. `
      + `Error: ${JSON.stringify(serializeError(err))}`)
  }
}

function _getPaymentHandler (paymentObject) {
  const paymentValidator = ValidatorBuilder.withPayment(paymentObject)
  if (paymentValidator.isPaypal())
    return paymentHandlers.paypalHandler
  if (paymentValidator.isCreditCard())
    return paymentHandlers.creditCardHandler
  if (paymentValidator.isKcp())
    return paymentHandlers.kcpHandler
  return paymentHandlers.fetchPaymentMethodsHandler
}

module.exports = { processRequest }
