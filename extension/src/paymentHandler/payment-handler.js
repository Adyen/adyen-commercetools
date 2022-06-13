import { withPayment } from '../validator/validator-builder.js'
import getPaymentMethodsHandler from './get-payment-methods.handler.js'
import execute from './make-payment.handler.js'
import makeLineitemsPaymentHandler from './make-lineitems-payment.handler.js'
import submitPaymentDetailsHandler from './submit-payment-details.handler.js'
import manualCaptureHandler from './manual-capture.handler.js'
import cancelHandler from './cancel-payment.handler.js'
import refundHandler from './refund-payment.handler.js'
import getCarbonOffsetCostsHandler from './get-carbon-offset-costs.handler.js'
import amountUpdatesHandler from './amount-updates.handler.js'
import {
  getChargeTransactionInitial,
  getAuthorizationTransactionSuccess,
  getCancelAuthorizationTransactionInit,
  listRefundTransactionsInit,
} from './payment-utils.js'
import { isBasicAuthEnabled } from '../validator/authentication.js'
import errorMessages from '../validator/error-messages.js'
import constants from '../config/constants.js'
import config from '../config/config.js'

const {
  CTP_ADYEN_INTEGRATION,
  PAYMENT_METHOD_TYPE_KLARNA_METHODS,
  PAYMENT_METHOD_TYPE_AFFIRM_METHODS,
  PAYMENT_METHODS_WITH_REQUIRED_LINE_ITEMS,
} = constants

async function handlePayment(paymentObject, authToken) {
  if (!_isAdyenPayment(paymentObject))
    // if it's not adyen payment, ignore the payment
    return { actions: [] }
  if (isBasicAuthEnabled() && !authToken) {
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
    listRefundTransactionsInit(paymentObject).length > 0 &&
    getAuthorizationTransactionSuccess(paymentObject)
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
    else handlers.push(execute)
  }
  if (
    paymentObject.custom.fields.makePaymentResponse &&
    paymentObject.custom.fields.submitAdditionalPaymentDetailsRequest &&
    !paymentObject.custom.fields.submitAdditionalPaymentDetailsResponse
  )
    handlers.push(submitPaymentDetailsHandler)
  if (
    paymentObject.custom.fields.amountUpdatesRequest &&
    !paymentObject.custom.fields.amountUpdatesResponse
  )
    handlers.push(amountUpdatesHandler)
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
  const paymentValidator = withPayment(paymentObject)
  if (!isBasicAuthEnabled()) {
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
  if (
    addCommercetoolsLineItemsFlag === true ||
    addCommercetoolsLineItemsFlag === false
  ) {
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
  // The function is tend to be used to check values on the field: true, false, undefined,
  // or the value set but not to true/false
  // in case of the undefined or other than true/false, the function returns undefined:
  // it means the other fallbacks have to be checked to decide adding line items
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

export default { handlePayment }
