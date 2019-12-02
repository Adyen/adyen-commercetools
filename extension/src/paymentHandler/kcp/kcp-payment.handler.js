const _ = require('lodash')

const pU = require('../payment-utils')
const kcpMakePayment = require('./kcp-make-payment.handler')

async function handlePayment (paymentObject) {
  const hasInitTransaction = _.isObject(pU.getAuthorizationTransactionInit(paymentObject))
  if (hasInitTransaction)
    return kcpMakePayment.handlePayment(paymentObject)
  return {
    actions: []
  }
}

module.exports = { handlePayment }
