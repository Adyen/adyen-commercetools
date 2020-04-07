const ValidatorBuilder = require('../validator/validator-builder')
const getPaymentMethodsHandler = require('../paymentHandler/get-payment-methods.handler')
const getOriginKeysHandler = require('../paymentHandler/get-origin-keys.handler')

const paymentHandlers = {
  getPaymentMethodsHandler,
  getOriginKeysHandler
}

/*
todo(ahmet)
- refactor the validation logic, most of the logic will be removed from validator builder.
- find a better structure for promise handler, mapping an promise array does not seem easy to understand.
- maybe step based validations could be done in handlePayments.
- what if handlePayment needs to return an error result rather than update actions ?
*/
async function handlePayment (paymentObject) {
  const validatorBuilder = ValidatorBuilder.withPayment(paymentObject)
  const adyenValidator = validatorBuilder.validateAdyen()
  if (adyenValidator.hasErrors())
    // if it's not adyen payment, ignore the payment
    return { success: true, data: null }

  const handlers = _getPaymentHandlers(paymentObject)
  const handlerResponses = await Promise.all(
    handlers.map(handler => handler.handlePayment(paymentObject)))
  const handlerResponse = {
    actions: handlerResponses.flatMap(result => result.actions)
  }
  return { success: true, data: handlerResponse }
}

function _getPaymentHandlers (paymentObject) {
  const result = []
  if (paymentObject.custom.fields.getOriginKeysRequest && !paymentObject.custom.fields.getOriginKeysResponse)
    result.push(paymentHandlers.getOriginKeysHandler)
  if (paymentObject.custom.fields.getPaymentMethodsRequest && !paymentObject.custom.fields.getPaymentMethodsResponse)
    result.push(paymentHandlers.getPaymentMethodsHandler)
  return result
}

module.exports = { handlePayment }
