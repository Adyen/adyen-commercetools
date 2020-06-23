const pU = require('./payment-utils')
const { manualCapture } = require('../service/web-component-service')
const {
  CTP_INTERACTION_TYPE_MANUAL_CAPTURE,
} = require('../config/constants')

async function execute (paymentObject) {
  const chargeInitialTransaction = pU.getChargeTransactionInitial(paymentObject)
  const authorizationSuccessTransaction = pU.getAuthorizationTransactionSuccess(paymentObject)
  const { request, response } = await manualCapture(chargeInitialTransaction,
    authorizationSuccessTransaction.interactionId)
  const actions = [
    pU.createAddInterfaceInteractionAction({
      request, response, type: CTP_INTERACTION_TYPE_MANUAL_CAPTURE
    }),
  ]
  if (!response.errorCode && response.pspReference) {
    actions.push(pU.createChangeTransactionStateAction(chargeInitialTransaction.id, 'Pending'))
    actions.push(pU.createChangeTransactionInteractionId(chargeInitialTransaction.id, response.pspReference))
  }


  return {
    actions
  }
}

module.exports = { execute }
