const _ = require('lodash')

const pU = require('../payment-utils')
const errorMessages = require('../../validator/error-messages')
const paypalMakePayment = require('./paypal-make-payment.handler')
const paypalCompletePayment = require('./paypal-complete-payment.handler')

async function handlePayment (paymentObject) {
  const hasPendingTransaction = _.isObject(pU.getChargeTransactionPending(paymentObject))
  if (hasPendingTransaction)
    return paypalCompletePayment.handlePayment(paymentObject)
  const hasInitTransaction = _.isObject(pU.getChargeTransactionInit(paymentObject))
  if (hasInitTransaction)
    return paypalMakePayment.handlePayment(paymentObject)

  return {
    errors: [{
      code: 'InvalidField',
      message: errorMessages.MISSING_TXN_CHARGE_INIT_PENDING
    }]
  }
}

module.exports = { handlePayment }
