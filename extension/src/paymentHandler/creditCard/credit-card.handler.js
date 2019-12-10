const _ = require('lodash')

const pU = require('../payment-utils')

const creditCardMakePayment = require('./credit-card-make-payment.handler')
const creditCardCompletePayment = require('./credit-card-complete-payment.handler')

async function handlePayment (paymentObject) {
  const hasPendingTransaction = _.isObject(pU.getAuthorizationTransactionPending(paymentObject))
  if (hasPendingTransaction)
    return creditCardCompletePayment.handlePayment(paymentObject)
  const hasInitTransaction = _.isObject(pU.getAuthorizationTransactionInit(paymentObject))
  if (hasInitTransaction)
    return creditCardMakePayment.handlePayment(paymentObject)
  return {
    actions: []
  }
}

module.exports = { handlePayment }
