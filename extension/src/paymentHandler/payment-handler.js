import { withPayment } from '../validator/validator-builder.js'
import makePaymentHandler from './make-payment.handler.js'
import submitPaymentDetailsHandler from './submit-payment-details.handler.js'
import manualCaptureHandler from './manual-capture.handler.js'
import cancelHandler from './cancel-payment.handler.js'
import refundHandler from './refund-payment.handler.js'
import donationHandler from './donation.handler.js'
import getPaymentMethodsHandler from './get-payment-methods.handler.js'
import getCarbonOffsetCostsHandler from './get-carbon-offset-costs.handler.js'
import amountUpdatesHandler from './amount-updates.handler.js'
import disableStoredPaymentHandler from './disable-stored-payment.handler.js'
import sessionRequestHandler from './sessions-request.handler.js'
import {
  getChargeTransactionInitial,
  getAuthorizationTransactionSuccess,
  getCancelAuthorizationTransactionInit,
  listRefundTransactionsInit,
} from './payment-utils.js'
import { isBasicAuthEnabled } from '../validator/authentication.js'
import errorMessages from '../validator/error-messages.js'

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

  if(_isDonationPayment(paymentObject)) return [donationHandler]


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
    handlers.push(makePaymentHandler)
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
    handlers.push(sessionRequestHandler)
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

function _isCancelPayment(paymentObject) {
  return (
    getAuthorizationTransactionSuccess(paymentObject) &&
    getCancelAuthorizationTransactionInit(paymentObject)
  )
}

function _isDonationPayment(paymentObject) {
    return (
        getAuthorizationTransactionSuccess(paymentObject) &&
        paymentObject?.custom?.fields?.donationRequest
    )
}

export default { handlePayment }
