const _ = require('lodash')

const pU = require('../payment-utils')

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
      message: 'Have one Charge transaction in state=\'Initial\' or state=\'Pending\''
    }]
  }
}

module.exports = { handlePayment }
