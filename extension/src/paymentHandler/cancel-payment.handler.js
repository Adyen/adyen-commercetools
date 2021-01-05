const pU = require('./payment-utils')
const { cancelPayment } = require('../service/web-component-service')
const { CTP_INTERACTION_TYPE_CANCEL_PAYMENT } = require('../config/constants')

async function execute(paymentObject) {
  const authorizationTransaction = pU.getAuthorizationTransactionSuccess(
    paymentObject
  )
  // "originalReference: The original pspReference of the payment that you want to cancel.
  // This reference is returned in the response to your payment request, and in the AUTHORISATION notification."
  const cancelRequestObj = {
    originalReference: authorizationTransaction.interactionId,
    reference: paymentObject.key,
  }

  const { request, response } = await cancelPayment(cancelRequestObj)

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
  const cancelTransaction = pU.getCancelAuthorizationTransactionInit(
    paymentObject
  )
  const transactionId = cancelTransaction.id

  return [
    pU.createChangeTransactionStateAction(transactionId, 'Pending'),
    pU.createChangeTransactionInteractionId(transactionId, pspReference),
  ]
}

module.exports = { execute }
