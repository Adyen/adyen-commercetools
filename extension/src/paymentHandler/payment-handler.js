import ValidatorBuilder from '../validator/validator-builder'
import getPaymentMethodsHandler from './get-payment-methods.handler'
import makePaymentHandler from './make-payment.handler'
import makeLineitemsPaymentHandler from './make-lineitems-payment.handler'
import submitPaymentDetailsHandler from './submit-payment-details.handler'
import manualCaptureHandler from './manual-capture.handler'
import cancelHandler from './cancel-payment.handler'
import refundHandler from './refund-payment.handler'
import getCarbonOffsetCostsHandler from './get-carbon-offset-costs.handler'
import pU from './payment-utils'
import auth from '../validator/authentication'
import errorMessages from '../validator/error-messages'
import constants from '../config/constants'

const {
  CTP_ADYEN_INTEGRATION,
  PAYMENT_METHOD_TYPE_KLARNA_METHODS,
  PAYMENT_METHOD_TYPE_AFFIRM_METHODS,
} = constants
const {
  getChargeTransactionInitial,
  getAuthorizationTransactionSuccess,
  getCancelAuthorizationTransactionInit,
} = pU

async function handlePayment(paymentObject, authToken) {
  if (!_isAdyenPayment(paymentObject))
    // if it's not adyen payment, ignore the payment
    return { actions: [] }
  if (auth.isBasicAuthEnabled() && !authToken) {
    return {
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
      errors: validatePaymentErrors,
    }

  const handlers = _getPaymentHandlers(paymentObject)
  const handlerResponses = await Promise.all(
    handlers.map((handler) => handler.execute(paymentObject))
  )
  const handlerResponse = {
    actions: handlerResponses.flatMap((result) => result.actions),
  }
  return { actions: handlerResponse.actions }
}

function _isRefund(paymentObject) {
  return (
    pU.listRefundTransactionsInit(paymentObject).length > 0 &&
    pU.getAuthorizationTransactionSuccess(paymentObject)
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
    paymentObject.custom.fields.getCarbonOffsetCostsRequest &&
    !paymentObject.custom.fields.getCarbonOffsetCostsResponse
  )
    handlers.push(getCarbonOffsetCostsHandler)
  if (
    paymentObject.custom.fields.makePaymentRequest &&
    !paymentObject.custom.fields.makePaymentResponse
  ) {
    const makePaymentRequestObj = JSON.parse(
      paymentObject.custom.fields.makePaymentRequest
    )
    if (_isKlarna(makePaymentRequestObj) || _isAffirm(makePaymentRequestObj))
      handlers.push(makeLineitemsPaymentHandler)
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
    if (paymentValidator.hasErrors()) return paymentValidator.getErrors()
  } else {
    paymentValidator.validateMetadataFields()
    if (paymentValidator.hasErrors()) return paymentValidator.getErrors()

    paymentValidator.validateAuthorizationHeader(authToken)
    if (paymentValidator.hasErrors()) return paymentValidator.getErrors()

    paymentValidator
      .validateRequestFields()
      .validateReference()
      .validateAmountPlanned()

    if (paymentValidator.hasErrors()) return paymentValidator.getErrors()
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

function _isAffirm(makePaymentRequestObj) {
  return (
    makePaymentRequestObj.paymentMethod &&
    PAYMENT_METHOD_TYPE_AFFIRM_METHODS.includes(
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

export default handlePayment
