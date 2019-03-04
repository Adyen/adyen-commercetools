const _ = require('lodash')

const pU = require('../payment-utils')

const creditCardMakePayment = require('./creditCardMakePayment.handler')
const creditCardCompletePayment = require('./creditCardCompletePayment.handler')
const errorMessages = require('../../validator/errorMessages')

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
