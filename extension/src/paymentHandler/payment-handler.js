const ValidatorBuilder = require('../validator/validator-builder')
const getPaymentMethodsHandler = require('./get-payment-methods.handler')
const makePaymentHandler = require('./make-payment.handler')
const klarnaMakePaymentHandler = require('./klarna-make-payment.handler')
const submitPaymentDetailsHandler = require('./submit-payment-details.handler')
const manualCaptureHandler = require('./manual-capture.handler')
const cancelHandler = require('./cancel-payment.handler')
const refundHandler = require('./refund-payment.handler')
const pU = require('./payment-utils')
const utils = require('../utils')
const errorMessages = require('../validator/error-messages')

const { CTP_ADYEN_INTEGRATION } = require('../config/constants')
const {
  getChargeTransactionInitial,
  getAuthorizationTransactionSuccess,
  getCancelAuthorizationTransactionInit,
} = require('./payment-utils')
const config = require('../config/config')

const PAYMENT_METHOD_TYPE_KLARNA_METHODS = [
  'klarna',
  'klarna_paynow',
  'klarna_account',
]

async function handlePayment(paymentObject, authToken) {
  if (!_isAdyenPayment(paymentObject))
    // if it's not adyen payment, ignore the payment
    return { success: true, data: null }

  const paymentValidator = ValidatorBuilder.withPayment(paymentObject)
    .validateMetadataFields()
    .validateRequestFields()
    .validateReference()
    .validateAmountPlanned()

  if (paymentValidator.hasErrors())
    return {
      success: false,
      data: paymentValidator.buildCtpErrorResponse(),
    }

  const ctpProjectKey = paymentObject.custom.fields.commercetoolsProjectKey
  const isAuthEnabled = utils.isAuthEnabled(ctpProjectKey)
  if (
    isAuthEnabled &&
    !_isAuthorized(paymentObject, authToken, ctpProjectKey)
  ) {
    return {
      success: false,
      data: {
        errors: [
          {
            code: 'InvalidOperation',
            message: errorMessages.UNAUTHORIZED_REQUEST,
          },
        ],
      },
    }
  }

  const handlers = _getPaymentHandlers(paymentObject)
  const handlerResponses = await Promise.all(
    handlers.map((handler) => handler.execute(paymentObject))
  )
  const handlerResponse = {
    actions: handlerResponses.flatMap((result) => result.actions),
  }
  return { success: true, data: handlerResponse }
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

function _isAuthorized(authTokenString, ctpProjectKey) {
  const ctpConfig = config.getCtpConfig(ctpProjectKey)
  const storedUsername = ctpConfig.username
  const storedPassword = ctpConfig.password
  // Split on a space, the original auth looks like  "Basic *********" and we need the 2nd part
  const encodedAuthToken = authTokenString.split(' ')

  // create a buffer and tell it the data coming in is base64
  const decodedAuthToken = Buffer.from(encodedAuthToken[1], 'base64').toString()

  const credentialString = decodedAuthToken.split(':')
  const username = credentialString[0]
  const password = credentialString[1]

  return storedUsername === username && storedPassword === password
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
