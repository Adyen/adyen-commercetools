const { isEmpty } = require('lodash')
const pU = require('./payment-utils')
const { cancelPayment } = require('../service/web-component-service')
const {
  CTP_INTERACTION_TYPE_CANCEL_PAYMENT
} = require('../config/constants')

async function execute (paymentObject) {
  // request adyen to cancel the transaction
  const { request, response } = await _cancelPayment(paymentObject)

  // create cancel transaction interface interaction for ctp
  const addInterfaceInteractionAction = pU.createAddInterfaceInteractionAction({
    request, response, type: CTP_INTERACTION_TYPE_CANCEL_PAYMENT
  })

  if (isEmpty(response.pspReference))
    return { actions: [addInterfaceInteractionAction] }

  // update the transaction state to pending in ctp
  const actions = [
    addInterfaceInteractionAction,
    ...getTransactionActions(paymentObject, response.pspReference)
  ]

  return { actions }
}


async function _cancelPayment (paymentObject) {
  const authorizationTransaction = pU.getAuthorizationTransactionSuccess(paymentObject)
  // "originalReference: The original pspReference of the payment that you want to cancel.
  // This reference is returned in the response to your payment request, and in the AUTHORISATION notification."
  const cancelRequestObj = { originalReference: authorizationTransaction.interactionId }

  // submit cancellation request to Adyen
  return cancelPayment(cancelRequestObj)
}

function getTransactionActions (paymentObject, pspReference) {
  const cancelTransaction = pU.getCancelAuthorizationTransactionInit(paymentObject)
  let transactionId
  if (cancelTransaction)
    transactionId = cancelTransaction.id

  return [
    pU.createChangeTransactionStateAction(transactionId, 'Pending'),
    pU.createChangeTransactionInteractionId(transactionId, pspReference)
  ]
}

module.exports = { execute }
