const ValidatorBuilder = require('../validator/validator-builder')
const creditCardHandler = require('../paymentHandler/creditCard/credit-card.handler')
const paypalHandler = require('../paymentHandler/paypal/paypal.handler')
const kcpHandler = require('../paymentHandler/kcp/kcp-payment.handler')
const refundHandler = require('../paymentHandler/cancel-or-refund.handler')
const fetchPaymentMethodsHandler = require('../paymentHandler/fetch-payment-methods.handler')

const paymentHandlers = {
  creditCardHandler,
  fetchPaymentMethodsHandler,
  paypalHandler,
  kcpHandler,
  refundHandler
}

async function handlePayment (paymentObject) {
    const validatorBuilder = ValidatorBuilder.withPayment(paymentObject)
    const adyenValidator = validatorBuilder
      .validateAdyen()
    if (adyenValidator.hasErrors())
    // if it's not adyen payment, ignore the payment
      return { success: true, data: null }
    const interfaceIdValidator = validatorBuilder
      .validateInterfaceIdField()
    if (interfaceIdValidator.hasErrors())
      return {
        success: false,
        data: interfaceIdValidator.buildCtpErrorResponse()
      }
    const paymentMethodValidator = validatorBuilder.validatePaymentMethod()
    if (paymentMethodValidator.hasErrors())
      return {
        success: false,
        data: paymentMethodValidator.buildCtpErrorResponse()
      }
    const handler = _getPaymentHandler(paymentObject)
    const handlerResponse = await handler.handlePayment(paymentObject)
    if (handlerResponse.errors)
      return { success: false, data: handlerResponse }
    return { success: true, data: handlerResponse }
  }
  

function _getPaymentHandler (paymentObject) {
    const paymentValidator = ValidatorBuilder.withPayment(paymentObject)
    if (paymentValidator.isCancelOrRefund())
      return paymentHandlers.refundHandler
    if (paymentValidator.isPaypal())
      return paymentHandlers.paypalHandler
    if (paymentValidator.isCreditCard())
      return paymentHandlers.creditCardHandler
    if (paymentValidator.isKcp())
      return paymentHandlers.kcpHandler
    return paymentHandlers.fetchPaymentMethodsHandler
  }

  
module.exports = { handlePayment }