const ValidatorBuilder = require('../validator/validator-builder')
const getPaymentMethodsHandler = require('./get-payment-methods.handler')
const makePaymentHandler = require('./make-payment.handler')
const makeLineitemsPaymentHandler = require('./make-lineitems-payment.handler')
const submitPaymentDetailsHandler = require('./submit-payment-details.handler')
const manualCaptureHandler = require('./manual-capture.handler')
const cancelHandler = require('./cancel-payment.handler')
const refundHandler = require('./refund-payment.handler')
const getCarbonOffsetCostsHandler = require('./get-carbon-offset-costs.handler')
const pU = require('./payment-utils')
const auth = require('../validator/authentication')
const errorMessages = require('../validator/error-messages')
const config = require('../config/config')

const {
  CTP_ADYEN_INTEGRATION,
  PAYMENT_METHOD_TYPE_KLARNA_METHODS,
  PAYMENT_METHOD_TYPE_AFFIRM_METHODS,
  PAYMENT_METHODS_WITH_REQUIRED_LINE_ITEMS,
} = require('../config/constants')
const {
  getChargeTransactionInitial,
  getAuthorizationTransactionSuccess,
  getCancelAuthorizationTransactionInit,
} = require('./payment-utils')

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
    if (_requiresLineItems(makePaymentRequestObj))
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

function _requiresLineItems(makePaymentRequestObj) {
  const addCommercetoolsLineItemsFlag = _getAddCommercetoolsLineItemsFlag(
    makePaymentRequestObj
  )
  if (addCommercetoolsLineItemsFlag !== undefined) {
    return addCommercetoolsLineItemsFlag
  }

  if (_isKlarna(makePaymentRequestObj) || _isAffirm(makePaymentRequestObj))
    return true

  const addCommercetoolsLineItemsAppConfigFlag =
    config.getModuleConfig().addCommercetoolsLineItems
  if (addCommercetoolsLineItemsAppConfigFlag === true)
    return _isPaymentMethodRequiresLineItems(makePaymentRequestObj)

  return false
}

function _getAddCommercetoolsLineItemsFlag(makePaymentRequestObj) {
  let addCommercetoolsLineItems
  if ('addCommercetoolsLineItems' in makePaymentRequestObj) {
    if (
      makePaymentRequestObj.addCommercetoolsLineItems === true ||
      makePaymentRequestObj.addCommercetoolsLineItems === false
    ) {
      addCommercetoolsLineItems =
        makePaymentRequestObj.addCommercetoolsLineItems
    }
  }
  return addCommercetoolsLineItems
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

function _isPaymentMethodRequiresLineItems(makePaymentRequestObj) {
  if (makePaymentRequestObj.paymentMethod) {
    const paymentMethodType = makePaymentRequestObj.paymentMethod.type
    for (const type of PAYMENT_METHODS_WITH_REQUIRED_LINE_ITEMS) {
      if (paymentMethodType.startsWith(type)) {
        return true
      }
    }
  }
  return false
}

function _isCancelPayment(paymentObject) {
  return (
    getAuthorizationTransactionSuccess(paymentObject) &&
    getCancelAuthorizationTransactionInit(paymentObject)
  )
}

module.exports = { handlePayment }
