const _ = require('lodash')

const pU = require('../payment-utils')

const creditCardMakePayment = require('./credit-card-make-payment.handler')
const creditCardCompletePayment = require('./credit-card-complete-payment.handler')
const errorMessages = require('../../validator/error-messages')

async function handlePayment (paymentObject) {
  const hasPendingTransaction = _.isObject(pU.getChargeTransactionPending(paymentObject))
  if (hasPendingTransaction)
    return creditCardCompletePayment.handlePayment(paymentObject)
  const hasInitTransaction = _.isObject(pU.getChargeTransactionInit(paymentObject))
  if (hasInitTransaction)
    return creditCardMakePayment.handlePayment(paymentObject)
  return {
    errors: [{
      code: 'InvalidField',
      message: errorMessages.MISSING_TXN_CHARGE_INIT_PENDING
    }]
  }
}

module.exports = { handlePayment }
