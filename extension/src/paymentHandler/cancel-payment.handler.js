import pU from './payment-utils.js'
import componentService from '../service/web-component-service.js'
import constants from '../config/constants.js'

const { CTP_INTERACTION_TYPE_CANCEL_PAYMENT } = constants
const { cancelPayment } = componentService

async function execute(paymentObject) {
  const authorizationTransaction =
    pU.getAuthorizationTransactionSuccess(paymentObject)
  // "originalReference: The original pspReference of the payment that you want to cancel.
  // This reference is returned in the response to your payment request, and in the AUTHORISATION notification."
  const cancelRequestObj = {
    originalReference: authorizationTransaction.interactionId,
    reference: paymentObject.key,
  }
  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const commercetoolsProjectKey =
    paymentObject.custom.fields.commercetoolsProjectKey

  const { request, response } = await cancelPayment(
    adyenMerchantAccount,
    commercetoolsProjectKey,
    cancelRequestObj
  )

  const addInterfaceInteractionAction = pU.createAddInterfaceInteractionAction({
    request,
    response,
    type: CTP_INTERACTION_TYPE_CANCEL_PAYMENT,
  })

  const actions = [addInterfaceInteractionAction]
  if (!response.errorCode && response.pspReference)
    actions.push(
      ..._createTransactionActions(paymentObject, response.pspReference)
    )

  return { actions }
}

function _createTransactionActions(paymentObject, pspReference) {
  const cancelTransaction =
    pU.getCancelAuthorizationTransactionInit(paymentObject)
  const transactionId = cancelTransaction.id

  return [
    pU.createChangeTransactionStateAction(transactionId, 'Pending'),
    pU.createChangeTransactionInteractionId(transactionId, pspReference),
  ]
}

export default execute
