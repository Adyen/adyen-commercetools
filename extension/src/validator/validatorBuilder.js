const _ = require('lodash')

const pU = require('../paymentHandler/payment-utils')
const errorMessages = require('./errorMessages')

function withPayment (paymentObject) {
  const errors = {}

  return {
    validateAdyen () {
      const isAdyen = paymentObject.paymentMethodInfo.paymentInterface === 'ctp-adyen-integration'
      if (!isAdyen)
        errors.isAdyen = errorMessages.MISSING_PAYMENT_INTERFACE
      return this
    },
    validatePaymentMethod () {
      const isValidMethod = this.isPaypal() || this.isKcp()
        || this.isCreditCard() || !paymentObject.paymentMethodInfo.method
      if (!isValidMethod)
        errors.isValidPaymentMethod = errorMessages.INVALID_PAYMENT_METHOD
      return this
    },
    isPaypal () {
      return paymentObject.paymentMethodInfo.method === 'paypal'
    },
    isKcp () {
      return paymentObject.paymentMethodInfo.method === 'kcp_banktransfer'
        || paymentObject.paymentMethodInfo.method === 'kcp_creditcard'
    },
    isCreditCard () {
      return paymentObject.paymentMethodInfo.method === 'creditCard'
        || paymentObject.paymentMethodInfo.method === 'creditCard_3d'
    },
    validateChargeTransactionPending () {
      const transaction = pU.getChargeTransactionPending(paymentObject)
      const hasChargeTransactionPending = _.isObject(transaction)
      if (!hasChargeTransactionPending)
        errors.hasChargeTransactionPending = errorMessages.MISSING_TXN_CHARGE_PENDING
      return this
    },
    validateChargeTransactionInit () {
      const transaction = pU.getChargeTransactionInit(paymentObject)
      const hasChargeTransactionInit = _.isObject(transaction)
      if (!hasChargeTransactionInit)
        errors.hasChargeTransactionInit = errorMessages.MISSING_TXN_CHARGE_INIT
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
    validateInterfaceIdField () {
      const hasInterfaceId = !_.isEmpty(paymentObject.interfaceId)
      if (!hasInterfaceId)
        errors.hasInterfaceId = errorMessages.MISSING_INTERFACE_ID
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
