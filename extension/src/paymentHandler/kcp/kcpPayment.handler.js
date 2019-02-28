const _ = require('lodash')

const pU = require('../payment-utils')
const kcpMakePayment = require('./kcpMakePayment.handler')

async function handlePayment (paymentObject) {
  const hasInitTransaction = _.isObject(pU.getChargeTransactionInit(paymentObject))
  if (hasInitTransaction)
    return kcpMakePayment.handlePayment(paymentObject)
  return {
    errors: [{
      code: 'InvalidField',
      message: 'Have one Charge transaction in state=\'Initial\' or state=\'Pending\''
    }]
  }
}

module.exports = { handlePayment }
