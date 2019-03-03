const _ = require('lodash')

const pU = require('../payment-utils')
const errorMessages = require('../../validator/errorMessages')
const paypalMakePayment = require('./paypalMakePayment.handler')
const paypalCompletePayment = require('./paypalCompletePayment.handler')

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
