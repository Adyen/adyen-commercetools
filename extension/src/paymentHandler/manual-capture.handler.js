import {
  getChargeTransactionInitial,
  getAuthorizationTransactionSuccess,
  createAddInterfaceInteractionAction,
  createChangeTransactionStateAction,
  createChangeTransactionInteractionId,
  getIdempotencyKey,
} from './payment-utils.js'
import { manualCapture } from '../service/web-component-service.js'
import constants from '../config/constants.js'

const { CTP_INTERACTION_TYPE_MANUAL_CAPTURE } = constants

async function execute(paymentObject) {
  const chargeInitialTransaction = getChargeTransactionInitial(paymentObject)
  const authorizationSuccessTransaction =
    getAuthorizationTransactionSuccess(paymentObject)
  const manualCaptureRequestObj = {
    modificationAmount: {
      value: chargeInitialTransaction.amount.centAmount,
      currency: chargeInitialTransaction.amount.currencyCode,
    },
    originalReference: authorizationSuccessTransaction.interactionId,
    reference: chargeInitialTransaction.custom?.fields?.reference,
  }
  const idempotencyKey = getIdempotencyKey(chargeInitialTransaction)
  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const commercetoolsProjectKey =
    paymentObject.custom.fields.commercetoolsProjectKey
  const { request, response } = await manualCapture(
    adyenMerchantAccount,
    commercetoolsProjectKey,
    idempotencyKey,
    manualCaptureRequestObj,
  )

  const actions = [
    createAddInterfaceInteractionAction({
      request,
      response,
      type: CTP_INTERACTION_TYPE_MANUAL_CAPTURE,
    }),
  ]
  if (!response.errorCode && response.pspReference) {
    actions.push(
      createChangeTransactionStateAction(
        chargeInitialTransaction.id,
        'Pending',
      ),
    )
    actions.push(
      createChangeTransactionInteractionId(
        chargeInitialTransaction.id,
        response.pspReference,
      ),
    )
  }

  return {
    actions,
  }
}

export default { execute }
