const _ = require('lodash')

const pU = require('../payment-utils')
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
    actions: []
  }
}

module.exports = { handlePayment }
