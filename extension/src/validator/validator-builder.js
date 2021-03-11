const pU = require('../paymentHandler/payment-utils')
const errorMessages = require('./error-messages')
const c = require('../config/constants')
const auth = require('./authentication')

function withPayment(paymentObject) {
  const errors = {}

  return {
    validateMetadataFields() {
      if (!paymentObject.custom) return this
      if (
        !pU.isValidMetadata(paymentObject.custom.fields.commercetoolsProjectKey)
      )
        errors.missingRequiredCtpProjectKey =
          errorMessages.MISSING_REQUIRED_FIELDS_CTP_PROJECT_KEY
      if (!pU.isValidMetadata(paymentObject.custom.fields.adyenMerchantAccount))
        errors.missingRequiredAdyenMerchantAcc =
          errorMessages.MISSING_REQUIRED_FIELDS_ADYEN_MERCHANT_ACCOUNT
      return this
    },
    validateAuthorizationHeader(authToken) {
      const ctpProjectKey = paymentObject.custom.fields.commercetoolsProjectKey
      const storedCredential = auth.getStoredCredential(ctpProjectKey)
      if (!storedCredential)
        errors.missingCredentials = errorMessages.MISSING_CREDENTIAL
      else if (!auth.hasValidAuthorizationHeader(storedCredential, authToken)) {
        errors.unauthorizedRequest = errorMessages.UNAUTHORIZED_REQUEST
      }
      return this
    },
    validateRequestFields() {
      if (!paymentObject.custom) return this
      if (!pU.isValidJSON(paymentObject.custom.fields.getPaymentMethodsRequest))
        errors.getPaymentMethodsRequest =
          errorMessages.GET_PAYMENT_METHODS_REQUEST_INVALID_JSON
      if (!pU.isValidJSON(paymentObject.custom.fields.makePaymentRequest))
        errors.makePaymentRequest =
          errorMessages.MAKE_PAYMENT_REQUEST_INVALID_JSON
      if (
        !pU.isValidJSON(
          paymentObject.custom.fields.submitAdditionalPaymentDetailsRequest
        )
      )
        errors.submitAdditionalPaymentDetailsRequest =
          errorMessages.SUBMIT_ADDITIONAL_PAYMENT_DETAILS_REQUEST_INVALID_JSON
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
      const makePaymentRequestInterfaceInteraction = pU.getLatestInterfaceInteraction(
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
        const amountInMakePaymentRequest = amount.value
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
    hasErrors() {
      return Object.keys(errors).length > 0
    },
    getErrors() {
      return errors
    },
    buildCtpErrorResponse() {
      const errorArray = Object.entries(errors).map(([, value]) => ({
        code: _getErrorResponseCode(value),
        message: value,
      }))
      return { errors: errorArray }
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

module.exports = { withPayment }
