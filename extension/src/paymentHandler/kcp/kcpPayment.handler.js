const _ = require('lodash')

const pU = require('../payment-utils')
const kcpMakePayment = require('./kcpMakePayment.handler')
const errorMessages = require('../../validator/errorMessages')

async function handlePayment (paymentObject) {
  const hasInitTransaction = _.isObject(pU.getChargeTransactionInit(paymentObject))
  if (hasInitTransaction)
    return kcpMakePayment.handlePayment(paymentObject)
  return {
    errors: [{
      code: 'InvalidField',
      message: errorMessages.MISSING_TXN_CHARGE_INIT_PENDING
    }]
  }
}

module.exports = { handlePayment }
