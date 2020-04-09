const ValidatorBuilder = require('../validator/validator-builder')
const getPaymentMethodsHandler = require('./get-payment-methods.handler')
const getOriginKeysHandler = require('./get-origin-keys.handler')

async function handlePayment (paymentObject) {
  const validatorBuilder = ValidatorBuilder.withPayment(paymentObject)
  const adyenValidator = validatorBuilder.validateAdyen()
  if (adyenValidator.hasErrors())
    // if it's not adyen payment, ignore the payment
    return { success: true, data: null }

  const requestValidator = validatorBuilder.validateRequestFields()
  if (requestValidator.hasErrors())
    return {
      success: false,
      data: requestValidator.buildCtpErrorResponse()
    }

  const handlers = _getPaymentHandlers(paymentObject)
  const handlerResponses = await Promise.all(
    handlers.map(handler => handler.execute(paymentObject)))
  const handlerResponse = {
    actions: handlerResponses.flatMap(result => result.actions)
  }
  return { success: true, data: handlerResponse }
}

function _getPaymentHandlers (paymentObject) {
  // custom field on payment is not a mandatory field.
  if (!paymentObject.custom)
    return []

  const handlers = []
  if (paymentObject.custom.fields.getOriginKeysRequest && !paymentObject.custom.fields.getOriginKeysResponse)
    handlers.push(getOriginKeysHandler)
  if (paymentObject.custom.fields.getPaymentMethodsRequest && !paymentObject.custom.fields.getPaymentMethodsResponse)
    handlers.push(getPaymentMethodsHandler)
  return handlers
}

module.exports = { handlePayment }
