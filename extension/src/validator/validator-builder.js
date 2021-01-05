const pU = require('../paymentHandler/payment-utils')
const errorMessages = require('./error-messages')
const c = require('../config/constants')

function withPayment(paymentObject) {
  const errors = {}

  return {
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
        code: 'InvalidField',
        message: value,
      }))
      return { errors: errorArray }
    },
  }
}

module.exports = { withPayment }
