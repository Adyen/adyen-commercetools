const _ = require('lodash')
const pU = require('../paymentHandler/payment-utils')
const errorMessages = require('./error-messages')
const c = require('../config/constants')

function withPayment (paymentObject) {
  const errors = {}

  return {
    validateRequestFields () {
      if (!paymentObject.custom)
        return this
      if (!pU.isValidJSON(paymentObject.custom.fields.getOriginKeysRequest))
        errors.getOriginKeysRequest = errorMessages.GET_ORIGIN_KEYS_REQUEST_INVALID_JSON
      if (!pU.isValidJSON(paymentObject.custom.fields.getPaymentMethodsRequest))
        errors.getPaymentMethodsRequest = errorMessages.GET_PAYMENT_METHODS_REQUEST_INVALID_JSON
      if (!pU.isValidJSON(paymentObject.custom.fields.makePaymentRequest))
        errors.makePaymentRequest = errorMessages.MAKE_PAYMENT_REQUEST_INVALID_JSON
      if (!pU.isValidJSON(paymentObject.custom.fields.submitAdditionalPaymentDetailsRequest))
        errors.submitAdditionalPaymentDetailsRequest
          = errorMessages.SUBMIT_ADDITIONAL_PAYMENT_DETAILS_REQUEST_INVALID_JSON
      return this
    },
    validateReference () {
      if (!paymentObject.custom || errors.makePaymentRequest)
        return this
      if (paymentObject.custom.fields.makePaymentRequest && !paymentObject.custom.fields.makePaymentResponse) {
        const makePaymentRequestObj = JSON.parse(paymentObject.custom.fields.makePaymentRequest)
        if (!makePaymentRequestObj.reference)
          errors.missingReference = errorMessages.MAKE_PAYMENT_REQUEST_MISSING_REFERENCE
      }
      return this
    },
    validateAmountPlanned () {
      if (!paymentObject.custom)
        return this

      const oldMakePaymentRequestObj = pU.getLatestInterfaceInteraction(
        paymentObject.interfaceInteractions, c.CTP_INTERACTION_TYPE_MAKE_PAYMENT
      )

      if (oldMakePaymentRequestObj) {
        const { amount } = JSON.parse(oldMakePaymentRequestObj.fields.request)
        const oldAmount = amount.value
        const newAmount = paymentObject.amountPlanned.centAmount
        const oldCurrencyCode = amount.currency
        const newCurrencyCode = paymentObject.amountPlanned.currencyCode
        if (oldAmount !== newAmount || oldCurrencyCode !== newCurrencyCode)
          errors.amountPlanned = errorMessages.AMOUNT_PLANNED_CHANGE_NOT_ALLOWED
      }
      return this
    },
    isCancelOrRefund () {
      return _.isObject(pU.getAuthorizationTransactionSuccess(paymentObject))
        && (_.isObject(pU.getCancelAuthorizationTransactionInit(paymentObject))
        || _.isObject(pU.getRefundTransactionInit(paymentObject)))
    },
    hasErrors () {
      return Object.keys(errors).length > 0
    },
    getErrors () {
      return errors
    },
    buildCtpErrorResponse () {
      const errorArray = Object.entries(errors).map(([, value]) => ({
        code: 'InvalidField',
        message: value
      }))
      return { errors: errorArray }
    }
  }
}

module.exports = { withPayment }
