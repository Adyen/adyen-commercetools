import { withPayment } from '../validator/validator-builder.js'
import makePaymentHandler from './make-payment.handler.js'
import makeLineitemsPaymentHandler from './make-lineitems-payment.handler.js'
import submitPaymentDetailsHandler from './submit-payment-details.handler.js'
import manualCaptureHandler from './manual-capture.handler.js'
import cancelHandler from './cancel-payment.handler.js'
import refundHandler from './refund-payment.handler.js'
import getPaymentMethodsHandler from './get-payment-methods.handler.js'
import getCarbonOffsetCostsHandler from './get-carbon-offset-costs.handler.js'
import amountUpdatesHandler from './amount-updates.handler.js'
import disableStoredPaymentHandler from './disable-stored-payment.handler.js'
import sessionRequestHandler from './sessions-request.handler.js'
import lineItemSessionRequestHandler from './sessions-line-items-request.handler.js'
import {
  getChargeTransactionInitial,
  getAuthorizationTransactionSuccess,
  getCancelAuthorizationTransactionInit,
  listRefundTransactionsInit,
} from './payment-utils.js'
import { isBasicAuthEnabled } from '../validator/authentication.js'
import errorMessages from '../validator/error-messages.js'
import config from '../config/config.js'

async function handlePayment(paymentObject, authToken) {
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
    authToken,
  )
  if (validatePaymentErrors)
    return {
      errors: validatePaymentErrors,
    }

  const handlers = _getPaymentHandlers(paymentObject)
  const handlerResponses = await Promise.all(
    handlers.map((handler) => handler.execute(paymentObject)),
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
  const customFields = paymentObject.custom.fields

  if (
    customFields.getPaymentMethodsRequest &&
    !customFields.getPaymentMethodsResponse
  ) {
    handlers.push(getPaymentMethodsHandler)
  }

  if (customFields.makePaymentRequest && !customFields.makePaymentResponse) {
    const makePaymentRequestObj = JSON.parse(customFields.makePaymentRequest)
    if (_requiresLineItems(makePaymentRequestObj))
      handlers.push(makeLineitemsPaymentHandler)
    else handlers.push(makePaymentHandler)
  }

  if (
    customFields.makePaymentResponse &&
    customFields.submitAdditionalPaymentDetailsRequest &&
    !customFields.submitAdditionalPaymentDetailsResponse
  )
    handlers.push(submitPaymentDetailsHandler)

  if (
    customFields.createSessionRequest &&
    !customFields.createSessionResponse
  ) {
    const createSessionRequestHandler = _getCreateSessionRequestHandler(
      customFields.createSessionRequest,
    )
    handlers.push(createSessionRequestHandler)
  }

  if (
    customFields.getCarbonOffsetCostsRequest &&
    !customFields.getCarbonOffsetCostsResponse
  ) {
    handlers.push(getCarbonOffsetCostsHandler)
  }

  if (
    customFields.amountUpdatesRequest &&
    !customFields.amountUpdatesResponse
  ) {
    handlers.push(amountUpdatesHandler)
  }

  if (
    getAuthorizationTransactionSuccess(paymentObject) &&
    getChargeTransactionInitial(paymentObject)
  ) {
    handlers.push(manualCaptureHandler)
  }

  if (
    customFields.disableStoredPaymentRequest &&
    !customFields.disableStoredPaymentResponse
  ) {
    handlers.push(disableStoredPaymentHandler)
  }

  return handlers
}

function _getCreateSessionRequestHandler(createSessionRequest) {
  const createSessionRequestObj = JSON.parse(createSessionRequest)

  if (_requiresLineItems(createSessionRequestObj)) {
    return lineItemSessionRequestHandler
  }

  return sessionRequestHandler
}

function _validatePaymentRequest(paymentObject, authToken) {
  const paymentValidator = withPayment(paymentObject)
  if (!isBasicAuthEnabled()) {
    paymentValidator
      .validateMetadataFields()
      .validateRequestFields()
      .validateReference()
      .validateAmountPlanned()
      .validatePaymentPspReference()
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

function _requiresLineItems(requestObj) {
  const addCommercetoolsLineItemsFlag =
    _getAddCommercetoolsLineItemsFlag(requestObj)
  if (
    addCommercetoolsLineItemsFlag === true ||
    addCommercetoolsLineItemsFlag === false
  ) {
    return addCommercetoolsLineItemsFlag
  }

  const addCommercetoolsLineItemsAppConfigFlag =
    config.getModuleConfig().addCommercetoolsLineItems
  if (addCommercetoolsLineItemsAppConfigFlag === true) return true

  return false
}

function _getAddCommercetoolsLineItemsFlag(requestObj) {
  // The function is tend to be used to check values on the field: true, false, undefined,
  // or the value set but not to true/false
  // in case of the undefined or other than true/false, the function returns undefined:
  // it means the other fallbacks have to be checked to decide adding line items
  let addCommercetoolsLineItems
  if ('addCommercetoolsLineItems' in requestObj) {
    if (
      requestObj.addCommercetoolsLineItems === true ||
      requestObj.addCommercetoolsLineItems === false
    ) {
      addCommercetoolsLineItems = requestObj.addCommercetoolsLineItems
    }
  }
  return addCommercetoolsLineItems
}

function _isCancelPayment(paymentObject) {
  return (
    getAuthorizationTransactionSuccess(paymentObject) &&
    getCancelAuthorizationTransactionInit(paymentObject)
  )
}

export default { handlePayment }
