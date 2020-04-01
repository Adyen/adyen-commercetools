const ValidatorBuilder = require('../validator/validator-builder')
const creditCardHandler = require('../paymentHandler/creditCard/credit-card.handler')
const paypalHandler = require('../paymentHandler/paypal/paypal.handler')
const kcpHandler = require('../paymentHandler/kcp/kcp-payment.handler')
const refundHandler = require('../paymentHandler/cancel-or-refund.handler')
const getPaymentMethodsHandler = require('../paymentHandler/get-payment-methods.handler')

const paymentHandlers = {
  creditCardHandler,
  getPaymentMethodsHandler,
  paypalHandler,
  kcpHandler,
  refundHandler
}

async function handlePayment (paymentObject) {
  const validatorBuilder = ValidatorBuilder.withPayment(paymentObject)
  const adyenValidator = validatorBuilder.validateAdyen()
  if (adyenValidator.hasErrors())
    // if it's not adyen payment, ignore the payment
    return { success: true, data: null }
  // todo(ahmet): validations will be removed.
  // const merchantReferenceValidator = validatorBuilder
  //   .validateMerchantReferenceField()
  // if (merchantReferenceValidator.hasErrors())
  //   return {
  //     success: false,
  //     data: merchantReferenceValidator.buildCtpErrorResponse()
  //   }
  // const paymentMethodValidator = validatorBuilder.validatePaymentMethod()
  // if (paymentMethodValidator.hasErrors())
  //   return {
  //     success: false,
  //     data: paymentMethodValidator.buildCtpErrorResponse()
  //   }
  const handler = _getPaymentHandler(paymentObject)
  const handlerResponse = await handler.handlePayment(paymentObject)
  if (handlerResponse.errors)
    return { success: false, data: handlerResponse }
  return { success: true, data: handlerResponse }
}

//todo(ahmet) handle needs to be changed
function _getPaymentHandler (paymentObject) {
  const paymentValidator = ValidatorBuilder.withPayment(paymentObject)
  // todo(ahmet): how the new custom type will be handled ?
  // if (paymentValidator.isCancelOrRefund())
  //   return paymentHandlers.refundHandler
  // todo(ahmet): will be removed.
  // if (paymentValidator.isPaypal())
  //   return paymentHandlers.paypalHandler
  // if (paymentValidator.isCreditCard())
  //   return paymentHandlers.creditCardHandler
  // if (paymentValidator.isKcp())
  //   return paymentHandlers.kcpHandler
  return paymentHandlers.getPaymentMethodsHandler
}


module.exports = { handlePayment }
