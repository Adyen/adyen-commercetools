const ValidatorBuilder = require('../validator/validator-builder')
const getPaymentMethodsHandler = require('./get-payment-methods.handler')
const makePaymentHandler = require('./make-payment.handler')
const klarnaMakePaymentHandler = require('./klarna-make-payment.handler')
const submitPaymentDetailsHandler = require('./submit-payment-details.handler')
const manualCaptureHandler = require('./manual-capture.handler')
const cancelHandler = require('./cancel-payment.handler')
const refundHandler = require('./refund-payment.handler')
const pU = require('./payment-utils')
const auth = require('../validator/authentication')
const errorMessages = require('../validator/error-messages')

const { CTP_ADYEN_INTEGRATION } = require('../config/constants')
const {
  getChargeTransactionInitial,
  getAuthorizationTransactionSuccess,
  getCancelAuthorizationTransactionInit,
} = require('./payment-utils')

const PAYMENT_METHOD_TYPE_KLARNA_METHODS = [
  'klarna',
  'klarna_paynow',
  'klarna_account',
]

async function handlePayment(paymentObject, authToken) {
  if (!_isAdyenPayment(paymentObject))
    // if it's not adyen payment, ignore the payment
    return { success: true, actions: [] }
  if (auth.isBasicAuthEnabled() && !authToken) {
    return {
      success: false,
      errors: [
        {
          code: 'Unauthorized',
          message: errorMessages.UNAUTHORIZED_REQUEST,
        },
      ],
    }
  }

  const validatePaymentErrors = _validatePaymentRequest(
    paymentObject,
    authToken
  )
  if (validatePaymentErrors)
    return {
      success: false,
      errors: validatePaymentErrors,
    }

  const handlers = _getPaymentHandlers(paymentObject)
  const handlerResponses = await Promise.all(
    handlers.map((handler) => handler.execute(paymentObject))
  )
  const handlerResponse = {
    actions: handlerResponses.flatMap((result) => result.actions),
  }
  return { success: true, actions: handlerResponse.actions }
}

function _isRefund(paymentObject) {
  return (
    pU.listRefundTransactionsInit(paymentObject).length > 0 &&
    (pU.getChargeTransactionSuccess(paymentObject) ||
      pU.getAuthorizationTransactionSuccess(paymentObject))
  )
}

function _getPaymentHandlers(paymentObject) {
  if (_isRefund(paymentObject)) return [refundHandler]

  if (_isCancelPayment(paymentObject)) return [cancelHandler]

  // custom field on payment is not a mandatory field.
  if (!paymentObject.custom) return []

  const handlers = []
  if (
    paymentObject.custom.fields.getPaymentMethodsRequest &&
    !paymentObject.custom.fields.getPaymentMethodsResponse
  )
    handlers.push(getPaymentMethodsHandler)
  if (
    paymentObject.custom.fields.makePaymentRequest &&
    !paymentObject.custom.fields.makePaymentResponse
  ) {
    const makePaymentRequestObj = JSON.parse(
      paymentObject.custom.fields.makePaymentRequest
    )
    if (_isKlarna(makePaymentRequestObj))
      handlers.push(klarnaMakePaymentHandler)
    else handlers.push(makePaymentHandler)
  }
  if (
    paymentObject.custom.fields.makePaymentResponse &&
    paymentObject.custom.fields.submitAdditionalPaymentDetailsRequest &&
    !paymentObject.custom.fields.submitAdditionalPaymentDetailsResponse
  )
    handlers.push(submitPaymentDetailsHandler)
  if (
    getAuthorizationTransactionSuccess(paymentObject) &&
    getChargeTransactionInitial(paymentObject)
  )
    handlers.push(manualCaptureHandler)
  return handlers
}

function _isAdyenPayment(paymentObject) {
  return (
    paymentObject.paymentMethodInfo.paymentInterface === CTP_ADYEN_INTEGRATION
  )
}

function _validatePaymentRequest(paymentObject, authToken) {
  const paymentValidator = ValidatorBuilder.withPayment(paymentObject)
  if (!auth.isBasicAuthEnabled()) {
    paymentValidator
      .validateMetadataFields()
      .validateRequestFields()
      .validateReference()
      .validateAmountPlanned()
    if (paymentValidator.hasErrors())
      return paymentValidator.buildCtpErrorResponse().errors
  } else {
    paymentValidator.validateMetadataFields()
    if (paymentValidator.hasErrors())
      return paymentValidator.buildCtpErrorResponse()?.errors

    paymentValidator.validateAuthorizationHeader(authToken)
    if (paymentValidator.hasErrors())
      return paymentValidator.buildCtpErrorResponse()?.errors

    paymentValidator
      .validateRequestFields()
      .validateReference()
      .validateAmountPlanned()

    if (paymentValidator.hasErrors())
      return paymentValidator.buildCtpErrorResponse()?.errors
  }
  return null
}

function _isKlarna(makePaymentRequestObj) {
  return (
    makePaymentRequestObj.paymentMethod &&
    PAYMENT_METHOD_TYPE_KLARNA_METHODS.includes(
      makePaymentRequestObj.paymentMethod.type
    )
  )
}

function _isCancelPayment(paymentObject) {
  return (
    getAuthorizationTransactionSuccess(paymentObject) &&
    getCancelAuthorizationTransactionInit(paymentObject)
  )
}

module.exports = { handlePayment }
