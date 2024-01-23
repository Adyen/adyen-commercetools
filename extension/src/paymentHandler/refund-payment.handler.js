import {
  listRefundTransactionsInit,
  getAuthorizationTransactionSuccess,
  createChangeTransactionStateAction,
  createAddInterfaceInteractionAction,
  createChangeTransactionInteractionId,
  getIdempotencyKey,
} from './payment-utils.js'
import { refund } from '../service/web-component-service.js'
import constants from '../config/constants.js'

const { CTP_INTERACTION_TYPE_REFUND } = constants

async function execute(paymentObject) {
  const refundInitTransactions = listRefundTransactionsInit(paymentObject)
  const transaction = getAuthorizationTransactionSuccess(paymentObject)
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
        reference:
          refundTransaction.custom?.fields?.reference || paymentObject.key,
      }

      const idempotencyKey = getIdempotencyKey(refundTransaction)
      const { request, response } = await refund(
        adyenMerchantAccount,
        commercetoolsProjectKey,
        idempotencyKey,
        refundRequestObjects,
      )
      const addInterfaceInteractionAction = createAddInterfaceInteractionAction(
        {
          request,
          response,
          type: CTP_INTERACTION_TYPE_REFUND,
        },
      )
      actions.push(addInterfaceInteractionAction)
      if (!response.errorCode && response.pspReference) {
        actions.push(
          createChangeTransactionStateAction(refundTransaction.id, 'Pending'),
        )
        actions.push(
          createChangeTransactionInteractionId(
            refundTransaction.id,
            response.pspReference,
          ),
        )
      }
    }),
  )

  return {
    actions,
  }
}

export default { execute }
