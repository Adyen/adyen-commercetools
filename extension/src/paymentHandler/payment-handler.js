const ValidatorBuilder = require('../validator/validator-builder')
const getPaymentMethodsHandler = require('../paymentHandler/get-payment-methods.handler')
const getOriginKeysHandler = require('../paymentHandler/get-origin-keys.handler')

const paymentHandlers = {
  getPaymentMethodsHandler,
  getOriginKeysHandler
}

async function handlePayment (paymentObject) {
  const validatorBuilder = ValidatorBuilder.withPayment(paymentObject)
  const adyenValidator = validatorBuilder.validateAdyen()
  if (adyenValidator.hasErrors())
    // if it's not adyen payment, ignore the payment
    return { success: true, data: null }

  // todo(ahmet): we should find a better structure than this, as its not easy to understand.
  const handlers = _getPaymentHandlers(paymentObject)
  const handlerResponses = await Promise.all(
    handlers.map(handler => handler.handlePayment(paymentObject)))
  const handlerResponse = {
    actions: handlerResponses.flatMap(result => result.actions)
  }

  // const errors = handlerResponses.flatMap(result => result.errors)
  // if (handlerResponses.errors)
  //   return { success: false, data: handlerResponse }
  return { success: true, data: handlerResponse }
}

//todo(ahmet) handle needs to be changed
function _getPaymentHandlers (paymentObject) {
  const result = []

  if (paymentObject.custom.fields.getOriginKeysRequest &&
    !paymentObject.custom.fields.getOriginKeysResponse)
    result.push(paymentHandlers.getOriginKeysHandler)

  if (paymentObject.custom.fields.getPaymentMethodsRequest &&
    !paymentObject.custom.fields.getPaymentMethodsResponse)
    result.push(paymentHandlers.getPaymentMethodsHandler)

  return result
}


module.exports = { handlePayment }
