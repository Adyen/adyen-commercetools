import pU from './payment-utils'
import componentService from '../service/web-component-service'
import constants from '../config/constants'

const { manualCapture } = componentService
const { CTP_INTERACTION_TYPE_MANUAL_CAPTURE } = constants

async function execute(paymentObject) {
  const chargeInitialTransaction = pU.getChargeTransactionInitial(paymentObject)
  const authorizationSuccessTransaction =
    pU.getAuthorizationTransactionSuccess(paymentObject)
  const manualCaptureRequestObj = {
    modificationAmount: {
      value: chargeInitialTransaction.amount.centAmount,
      currency: chargeInitialTransaction.amount.currencyCode,
    },
    originalReference: authorizationSuccessTransaction.interactionId,
  }

  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const commercetoolsProjectKey =
    paymentObject.custom.fields.commercetoolsProjectKey
  const { request, response } = await manualCapture(
    adyenMerchantAccount,
    commercetoolsProjectKey,
    manualCaptureRequestObj
  )

  const actions = [
    pU.createAddInterfaceInteractionAction({
      request,
      response,
      type: CTP_INTERACTION_TYPE_MANUAL_CAPTURE,
    }),
  ]
  if (!response.errorCode && response.pspReference) {
    actions.push(
      pU.createChangeTransactionStateAction(
        chargeInitialTransaction.id,
        'Pending'
      )
    )
    actions.push(
      pU.createChangeTransactionInteractionId(
        chargeInitialTransaction.id,
        response.pspReference
      )
    )
  }

  return {
    actions,
  }
}

export default { execute }
