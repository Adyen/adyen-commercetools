const _ = require('lodash')
const { CTP_ADYEN_INTEGRATION } = require('../config/constants')
const pU = require('../paymentHandler/payment-utils')
const errorMessages = require('./error-messages')

function withPayment (paymentObject) {
  const errors = {}

  return {
    validateAdyen () {
      const isAdyen = paymentObject.paymentMethodInfo.paymentInterface === CTP_ADYEN_INTEGRATION
      if (!isAdyen)
        errors.isAdyen = errorMessages.MISSING_PAYMENT_INTERFACE
      return this
    },
    validateRequestFields() {
      if (!paymentObject.custom)
        return this
      if (invalidJSON(paymentObject.custom.fields.getOriginKeysRequest)) {
        errors.getOriginKeysRequest = errorMessages.GET_ORIGIN_KEYS_REQUEST_INVALID_JSON
      }
      if (invalidJSON(paymentObject.custom.fields.getPaymentMethodsRequest)) {
        errors.getPaymentMethodsRequest = errorMessages.GET_PAYMENT_METHODS_REQUEST_INVALID_JSON
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

function invalidJSON(requestString) {
  if (typeof requestString == 'undefined')
    return false
  try {
    const o = JSON.parse(requestString)
    if (o && typeof o === 'object') {
      return false
    }
  }
  catch (ignore) { }
  return true
}

module.exports = { withPayment }
