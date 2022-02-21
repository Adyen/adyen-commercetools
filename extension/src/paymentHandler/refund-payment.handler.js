import pU from './payment-utils.js'
import componentService from '../service/web-component-service.js'
import constants from '../config/constants.js'

const { refund } = componentService
const { CTP_INTERACTION_TYPE_REFUND } = constants

async function execute(paymentObject) {
  const refundInitTransactions = pU.listRefundTransactionsInit(paymentObject)
  const transaction = pU.getAuthorizationTransactionSuccess(paymentObject)
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
      }
    })
  )

  return {
    actions,
  }
}

export default execute
