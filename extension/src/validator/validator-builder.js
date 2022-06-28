import {
  isValidMetadata,
  isValidJSON,
  getLatestInterfaceInteraction,
} from '../paymentHandler/payment-utils.js'
import errorMessages from './error-messages.js'
import c from '../config/constants.js'
import {
  getStoredCredential,
  hasValidAuthorizationHeader,
} from './authentication.js'

function withPayment(paymentObject) {
  const errors = {}

  return {
    validateMetadataFields() {
      if (!paymentObject.custom) return this
      if (!isValidMetadata(paymentObject.custom.fields.commercetoolsProjectKey))
        errors.missingRequiredCtpProjectKey =
          errorMessages.MISSING_REQUIRED_FIELDS_CTP_PROJECT_KEY
      if (!isValidMetadata(paymentObject.custom.fields.adyenMerchantAccount))
        errors.missingRequiredAdyenMerchantAcc =
          errorMessages.MISSING_REQUIRED_FIELDS_ADYEN_MERCHANT_ACCOUNT
      return this
    },
    validateAuthorizationHeader(authToken) {
      const ctpProjectKey = paymentObject.custom.fields.commercetoolsProjectKey
      const storedCredential = getStoredCredential(ctpProjectKey)
      if (!storedCredential)
        errors.missingCredentials = errorMessages.MISSING_CREDENTIAL
      else if (!hasValidAuthorizationHeader(storedCredential, authToken)) {
        errors.unauthorizedRequest = errorMessages.UNAUTHORIZED_REQUEST
      }
      return this
    },
    validateRequestFields() {
      if (!paymentObject.custom) return this
      if (!isValidJSON(paymentObject.custom.fields.getPaymentMethodsRequest))
        errors.getPaymentMethodsRequest =
          errorMessages.GET_PAYMENT_METHODS_REQUEST_INVALID_JSON
      if (!isValidJSON(paymentObject.custom.fields.makePaymentRequest))
        errors.makePaymentRequest =
          errorMessages.MAKE_PAYMENT_REQUEST_INVALID_JSON
      if (
        !isValidJSON(
          paymentObject.custom.fields.submitAdditionalPaymentDetailsRequest
        )
      )
        errors.submitAdditionalPaymentDetailsRequest =
          errorMessages.SUBMIT_ADDITIONAL_PAYMENT_DETAILS_REQUEST_INVALID_JSON
      if (!isValidJSON(paymentObject.custom.fields.getCarbonOffsetCostsRequest))
        errors.getCarbonOffsetCostsRequest =
          errorMessages.GET_CARBON_OFFSET_COSTS_REQUEST_INVALID_JSON
      if (!isValidJSON(paymentObject.custom.fields.amountUpdatesRequest))
        errors.amountUpdatesRequest =
          errorMessages.AMOUNT_UPDATES_REQUEST_INVALID_JSON
      return this
    },
    validateReference() {
      if (!paymentObject.custom || errors.makePaymentRequest) return this
      if (
        paymentObject.custom.fields.makePaymentRequest &&
        !paymentObject.custom.fields.makePaymentResponse
      ) {
        const makePaymentRequestObj = JSON.parse(
          paymentObject.custom.fields.makePaymentRequest
        )
        if (!makePaymentRequestObj.reference)
          errors.missingReference =
            errorMessages.MAKE_PAYMENT_REQUEST_MISSING_REFERENCE
      }
      return this
    },
    validateAmountPlanned() {
      let amount
      const makePaymentRequestInterfaceInteraction =
        getLatestInterfaceInteraction(
          paymentObject.interfaceInteractions,
          c.CTP_INTERACTION_TYPE_MAKE_PAYMENT
        )
      if (makePaymentRequestInterfaceInteraction)
        amount = JSON.parse(
          makePaymentRequestInterfaceInteraction.fields.request
        ).amount
      else {
        const makePaymentRequestString =
          paymentObject.custom &&
          paymentObject.custom.fields &&
          paymentObject.custom.fields.makePaymentRequest
        if (makePaymentRequestString)
          amount = JSON.parse(makePaymentRequestString).amount
      }
      if (amount) {
        const amountInMakePaymentRequest = Number(amount.value)
        const amountPlannedValue = paymentObject.amountPlanned.centAmount
        const currencyInMakePaymentRequest = amount.currency
        const currencyInAmountPlanned = paymentObject.amountPlanned.currencyCode
        if (
          amountInMakePaymentRequest !== amountPlannedValue ||
          currencyInMakePaymentRequest !== currencyInAmountPlanned
        )
          errors.amountPlanned = errorMessages.AMOUNT_PLANNED_NOT_SAME
      }
      return this
    },
    validatePaymentPspReference() {
      if (!paymentObject.custom || errors.amountUpdatesRequest) return this
      if (
        paymentObject.custom.fields.amountUpdatesRequest &&
        !paymentObject.custom.fields.amountUpdatesResponse
      ) {
        const amountUpdatesRequestObj = JSON.parse(
          paymentObject.custom.fields.amountUpdatesRequest
        )
        if (!amountUpdatesRequestObj.paymentPspReference)
          errors.missingPspReference =
            errorMessages.AMOUNT_UPDATES_REQUEST_MISSING_PSP_REFERENCE
      }
      return this
    },
    hasErrors() {
      return Object.keys(errors).length > 0
    },
    getErrors() {
      return Object.entries(errors).map(([, value]) => ({
        code: _getErrorResponseCode(value),
        message: value,
      }))
    },
  }
}

function _getErrorResponseCode(value) {
  if (
    value === errorMessages.UNAUTHORIZED_REQUEST ||
    value === errorMessages.MISSING_CREDENTIAL
  )
    return 'Unauthorized'
  return 'InvalidField'
}

export { withPayment }
