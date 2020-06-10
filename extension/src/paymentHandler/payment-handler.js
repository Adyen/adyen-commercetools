const ValidatorBuilder = require('../validator/validator-builder')
const getPaymentMethodsHandler = require('./get-payment-methods.handler')
const getOriginKeysHandler = require('./get-origin-keys.handler')
const makePaymentHandler = require('./make-payment.handler')
const klarnaMakePaymentHandler = require('./klarna-make-payment.handler')
const submitPaymentDetailsHandler = require('./submit-payment-details.handler')
const cancelOrRefundHandler = require('./cancel-or-refund.handler')
const manualCaptureHandler = require('./manual-capture.handler')
const { CTP_ADYEN_INTEGRATION } = require('../config/constants')

const PAYMENT_METHOD_TYPE_KLARNA_METHODS = ['klarna', 'klarna_paynow', 'klarna_account']


async function handlePayment (paymentObject) {
  if (!_isAdyenPayment(paymentObject))
    // if it's not adyen payment, ignore the payment
    return { success: true, data: null }

  const paymentValidator = ValidatorBuilder.withPayment(paymentObject)
    .validateRequestFields()
    .validateAmountPlanned()
  if (paymentValidator.hasErrors())
    return {
      success: false,
      data: paymentValidator.buildCtpErrorResponse()
    }

  const isCancelOrRefund = paymentValidator.isCancelOrRefund()
  if (isCancelOrRefund) {
    const cancelOrRefundResponse = await cancelOrRefundHandler.execute(paymentObject)
    return { success: true, data: cancelOrRefundResponse }
  }

  const handlers = _getPaymentHandlers(paymentObject)
  const handlerResponses = await Promise.all(
    handlers.map(handler => handler.execute(paymentObject))
  )
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
  if (paymentObject.custom.fields.makePaymentRequest && !paymentObject.custom.fields.makePaymentResponse) {
    const makePaymentRequestObj = JSON.parse(paymentObject.custom.fields.makePaymentRequest)
    if (_isKlarna(makePaymentRequestObj))
      handlers.push(klarnaMakePaymentHandler)
    else
      handlers.push(makePaymentHandler)
  }
  if (paymentObject.custom.fields.makePaymentResponse
    && paymentObject.custom.fields.submitAdditionalPaymentDetailsRequest
    && !paymentObject.custom.fields.submitAdditionalPaymentDetailsResponse)
    handlers.push(submitPaymentDetailsHandler)
  if (paymentObject.custom.fields.manualCaptureRequest && !paymentObject.custom.fields.manualCaptureResponse)
    handlers.push(manualCaptureHandler)
  return handlers
}

function _isAdyenPayment (paymentObject) {
  return paymentObject.paymentMethodInfo.paymentInterface === CTP_ADYEN_INTEGRATION
}

function _isKlarna (makePaymentRequestObj) {
  return PAYMENT_METHOD_TYPE_KLARNA_METHODS.includes(makePaymentRequestObj.paymentMethod.type)
}

module.exports = { handlePayment }
