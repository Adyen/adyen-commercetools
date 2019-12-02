const _ = require('lodash')

const pU = require('../payment-utils')
const paypalMakePayment = require('./paypal-make-payment.handler')
const paypalCompletePayment = require('./paypal-complete-payment.handler')

async function handlePayment (paymentObject) {
  const hasPendingTransaction = _.isObject(pU.getAuthorizationTransactionPending(paymentObject))
  if (hasPendingTransaction)
    return paypalCompletePayment.handlePayment(paymentObject)
  const hasInitTransaction = _.isObject(pU.getAuthorizationTransactionInit(paymentObject))
  if (hasInitTransaction)
    return paypalMakePayment.handlePayment(paymentObject)

  return {
    actions: []
  }
}

module.exports = { handlePayment }
