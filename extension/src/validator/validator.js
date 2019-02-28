const _ = require('lodash')

const pU = require('../paymentHandler/payment-utils')

function validate (paymentObject) {
  const errors = {}

  return {
    validateAdyen () {
      const isAdyen = paymentObject.paymentMethodInfo.paymentInterface === 'ctp-adyen-integration'
      if (!isAdyen)
        errors.isAdyen = 'Set paymentMethodInfo.paymentInterface = \'ctp-adyen-integration\''
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
        errors.hasChargeTransactionPending = 'Have one transaction with type=\'Charge\' AND state=\'Pending\''
      return this
    },
    validateChargeTransactionInit () {
      const transaction = pU.getChargeTransactionInit(paymentObject)
      const hasChargeTransactionInit = _.isObject(transaction)
      if (!hasChargeTransactionInit)
        errors.hasChargeTransactionInit = 'Have one transaction with type=\'Charge\' AND state=\'Initial\''
      return this
    },
    validateEncryptedCardNumberField () {
      const hasEncryptedCardNumber = _.isObject(paymentObject.custom)
        && _.isObject(paymentObject.custom.fields)
        && !_.isEmpty(paymentObject.custom.fields.encryptedCardNumber)
      if (!hasEncryptedCardNumber)
        errors.hasEncryptedCardNumber = 'Set custom.fields.encryptedCardNumber'
      return this
    },
    validateEncryptedExpiryMonthField () {
      const hasEncryptedExpiryMonth = _.isObject(paymentObject.custom)
        && _.isObject(paymentObject.custom.fields)
        && !_.isEmpty(paymentObject.custom.fields.encryptedExpiryMonth)
      if (!hasEncryptedExpiryMonth)
        errors.hasEncryptedExpiryMonth = 'Set custom.fields.encryptedExpiryMonth'
      return this
    },
    validateEncryptedExpiryYearField () {
      const hasEncryptedExpiryYear = _.isObject(paymentObject.custom)
        && _.isObject(paymentObject.custom.fields)
        && !_.isEmpty(paymentObject.custom.fields.encryptedExpiryYear)
      if (!hasEncryptedExpiryYear)
        errors.hasEncryptedExpiryYear = 'Set custom.fields.encryptedExpiryYear'
      return this
    },
    validateEncryptedSecurityCodeField () {
      const hasEncryptedSecurityCode = _.isObject(paymentObject.custom)
        && _.isObject(paymentObject.custom.fields)
        && !_.isEmpty(paymentObject.custom.fields.encryptedSecurityCode)
      if (!hasEncryptedSecurityCode)
        errors.hasEncryptedSecurityCode = 'Set custom.fields.encryptedSecurityCode'
      return this
    },
    validateReturnUrlField () {
      const hasReturnUrl = _.isObject(paymentObject.custom)
        && _.isObject(paymentObject.custom.fields)
        && !_.isEmpty(paymentObject.custom.fields.returnUrl)
      if (!hasReturnUrl)
        errors.hasReturnUrl = 'Set custom.fields.returnUrl'
      return this
    },
    validateInterfaceIdField () {
      const hasInterfaceId = !_.isEmpty(paymentObject.interfaceId)
      if (!hasInterfaceId)
        errors.hasInterfaceId = 'Set interfaceId'
      return this
    },
    validatePayloadField () {
      const hasPayload = _.isObject(paymentObject.custom)
        && _.isObject(paymentObject.custom.fields)
        && !_.isEmpty(paymentObject.custom.fields.payload)
      if (!hasPayload)
        errors.hasPayload = 'Set custom.fields.payload'
      return this
    },
    validatePaymentDataField () {
      const hasPaymentData = _.isObject(paymentObject.custom)
        && _.isObject(paymentObject.custom.fields)
        && !_.isEmpty(paymentObject.custom.fields.paymentData)
      if (!hasPaymentData)
        errors.hasPaymentData = 'Set custom.fields.paymentData'
      return this
    },
    validatePaResField () {
      const hasPaRes = _.isObject(paymentObject.custom)
        && _.isObject(paymentObject.custom.fields)
        && !_.isEmpty(paymentObject.custom.fields.PaRes)
      if (!hasPaRes)
        errors.hasPaRes = 'Set custom.fields.PaRes'
      return this
    },
    validateMdField () {
      const hasMD = _.isObject(paymentObject.custom)
        && _.isObject(paymentObject.custom.fields)
        && !_.isEmpty(paymentObject.custom.fields.MD)
      if (!hasMD)
        errors.hasMD = 'Set custom.fields.MD'
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

module.exports = { validate }
