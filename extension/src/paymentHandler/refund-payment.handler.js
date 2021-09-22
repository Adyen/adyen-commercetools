const pU = require('./payment-utils')
const { refund } = require('../service/web-component-service')
const { CTP_INTERACTION_TYPE_REFUND } = require('../config/constants')

async function execute(paymentObject) {
  const refundInitTransactions = pU.listRefundTransactionsInit(paymentObject)
  let transaction = pU.getChargeTransactionSuccess(paymentObject)
  if (!transaction)
    transaction = pU.getAuthorizationTransactionSuccess(paymentObject)
  const interactionId = transaction.interactionId
  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const commercetoolsProjectKey =
    paymentObject.custom.fields.commercetoolsProjectKey

  const actions = []

  await Promise.all(
    refundInitTransactions.map(async (refundTransaction) => {
      const refundRequestObjects = {
        modificationAmount: {
          value: refundTransaction.amount.centAmount,
          currency: refundTransaction.amount.currencyCode,
        },
        originalReference: interactionId,
        reference: paymentObject.key,
      }

      const { request, response } = await refund(
        adyenMerchantAccount,
        commercetoolsProjectKey,
        refundRequestObjects
      )
      const addInterfaceInteractionAction =
        pU.createAddInterfaceInteractionAction({
          request,
          response,
          type: CTP_INTERACTION_TYPE_REFUND,
        })
      actions.push(addInterfaceInteractionAction)
      if (!response.errorCode && response.pspReference) {
        actions.push(
          pU.createChangeTransactionStateAction(refundTransaction.id, 'Pending')
        )
        actions.push(
          pU.createChangeTransactionInteractionId(
            refundTransaction.id,
            response.pspReference
          )
        )
        actions.push(
          pU.createChangeTransactionTimestampAction(refundTransaction.id)
        )
      }
    })
  )

  return {
    actions,
  }
}

module.exports = { execute }
