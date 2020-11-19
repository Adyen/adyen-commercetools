const Promise = require('bluebird')
const pU = require('./payment-utils')
const { refund } = require('../service/web-component-service')
const {
  CTP_INTERACTION_TYPE_REFUND,
} = require('../config/constants')

async function execute (paymentObject) {
  const refundInitTransactions = pU.listRefundTransactionsInit(paymentObject)
  const chargeSuccessTransaction = pU.getChargeTransactionSuccess(paymentObject)

  const actions = []

  await Promise.map(refundInitTransactions, async (refundTransaction) => {
    const refundRequestObjects = {
      modificationAmount: {
        value: refundTransaction.amount.centAmount,
        currency: refundTransaction.amount.currencyCode
      },
      originalReference: chargeSuccessTransaction.interactionId
    }

    const { request, response } = await refund(refundRequestObjects)
    const addInterfaceInteractionAction = pU.createAddInterfaceInteractionAction({
      request, response, type: CTP_INTERACTION_TYPE_REFUND
    })
    actions.push(addInterfaceInteractionAction)
    if (!response.errorCode && response.pspReference) {
      actions.push(pU.createChangeTransactionStateAction(refundTransaction.id, 'Pending'))
      actions.push(pU.createChangeTransactionInteractionId(refundTransaction.id, response.pspReference))
    }
  })

  return {
    actions
  }
}

module.exports = { execute }
