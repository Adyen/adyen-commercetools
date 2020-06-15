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
      if (!pU.isValidJSON(paymentObject.custom.fields.manualCaptureRequest))
        errors.manualCaptureRequest = errorMessages.MANUAL_CAPTURE_REQUEST_INVALID_JSON

      return this
    },
    validateAmountPlanned () {
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
    validateAuthorizationTransactionPending () {
      const transaction = pU.getAuthorizationTransactionPending(paymentObject)
      const hasAuthorizationTransactionPending = _.isObject(transaction)
      if (!hasAuthorizationTransactionPending)
        errors.hasAuthorizationTransactionPending = errorMessages.MISSING_TXN_AUTHORIZATION_PENDING
      return this
    },
    validateAuthorizationTransactionInit () {
      const transaction = pU.getAuthorizationTransactionInit(paymentObject)
      const hasAuthorizationTransactionInit = _.isObject(transaction)
      if (!hasAuthorizationTransactionInit)
        errors.hasAuthorizationTransactionInit = errorMessages.MISSING_TXN_AUTHORIZATION_INIT
      return this
    },
    validateEncryptedCardNumberField () {
      const hasEncryptedCardNumber = _.isObject(paymentObject.custom)
        && _.isObject(paymentObject.custom.fields)
        && !_.isEmpty(paymentObject.custom.fields.encryptedCardNumber)
      if (!hasEncryptedCardNumber)
        errors.hasEncryptedCardNumber = errorMessages.MISSING_CARD_NUMBER
      return this
    },
    validateEncryptedExpiryMonthField () {
      const hasEncryptedExpiryMonth = _.isObject(paymentObject.custom)
        && _.isObject(paymentObject.custom.fields)
        && !_.isEmpty(paymentObject.custom.fields.encryptedExpiryMonth)
      if (!hasEncryptedExpiryMonth)
        errors.hasEncryptedExpiryMonth = errorMessages.MISSING_EXPIRY_MONTH
      return this
    },
    validateEncryptedExpiryYearField () {
      const hasEncryptedExpiryYear = _.isObject(paymentObject.custom)
        && _.isObject(paymentObject.custom.fields)
        && !_.isEmpty(paymentObject.custom.fields.encryptedExpiryYear)
      if (!hasEncryptedExpiryYear)
        errors.hasEncryptedExpiryYear = errorMessages.MISSING_EXPIRY_YEAR
      return this
    },
    validateEncryptedSecurityCodeField () {
      const hasEncryptedSecurityCode = _.isObject(paymentObject.custom)
        && _.isObject(paymentObject.custom.fields)
        && !_.isEmpty(paymentObject.custom.fields.encryptedSecurityCode)
      if (!hasEncryptedSecurityCode)
        errors.hasEncryptedSecurityCode = errorMessages.MISSING_SECURITY_CODE
      return this
    },
    validateReturnUrlField () {
      const hasReturnUrl = _.isObject(paymentObject.custom)
        && _.isObject(paymentObject.custom.fields)
        && !_.isEmpty(paymentObject.custom.fields.returnUrl)
      if (!hasReturnUrl)
        errors.hasReturnUrl = errorMessages.MISSING_RETURN_URL
      return this
    },
    validatePayloadField () {
      const hasPayload = _.isObject(paymentObject.custom)
        && _.isObject(paymentObject.custom.fields)
        && !_.isEmpty(paymentObject.custom.fields.payload)
      if (!hasPayload)
        errors.hasPayload = errorMessages.MISSING_PAYLOAD
      return this
    },
    validatePaymentDataField () {
      const hasPaymentData = _.isObject(paymentObject.custom)
        && _.isObject(paymentObject.custom.fields)
        && !_.isEmpty(paymentObject.custom.fields.paymentData)
      if (!hasPaymentData)
        errors.hasPaymentData = errorMessages.MISSING_PAYMENT_DATA
      return this
    },
    validatePaResField () {
      const hasPaRes = _.isObject(paymentObject.custom)
        && _.isObject(paymentObject.custom.fields)
        && !_.isEmpty(paymentObject.custom.fields.PaRes)
      if (!hasPaRes)
        errors.hasPaRes = errorMessages.MISSING_PARES
      return this
    },
    validateMdField () {
      const hasMD = _.isObject(paymentObject.custom)
        && _.isObject(paymentObject.custom.fields)
        && !_.isEmpty(paymentObject.custom.fields.MD)
      if (!hasMD)
        errors.hasMD = errorMessages.MISSING_MD
      return this
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
