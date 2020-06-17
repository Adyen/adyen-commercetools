const { isEmpty } = require('lodash')
const pU = require('./payment-utils')
const { cancelOrRefund } = require('../service/web-component-service')

const {
  CTP_INTERACTION_TYPE_MAKE_PAYMENT,
  CTP_INTERACTION_TYPE_CANCEL_OR_REFUND
} = require('../config/constants')

async function execute (paymentObject) {
  const { request, response } = await _cancelOrRefundPayment(paymentObject)

  const addInterfaceInteractionAction = pU.createAddInterfaceInteractionAction({
      request, response, type: CTP_INTERACTION_TYPE_CANCEL_OR_REFUND
  })

  if (isEmpty(response.pspReference))
    return { actions: [ addInterfaceInteractionAction ] }

  const actions = [
    addInterfaceInteractionAction,
    ...getTransactionActions(paymentObject, response.pspReference)
  ]

  return { actions }
}

async function _cancelOrRefundPayment (paymentObject) {
  const authorizationTransaction = pU.getAuthorizationTransactionSuccess(paymentObject)
  // "originalReference: The original pspReference of the payment that you want to cancel or refund.
  // This reference is returned in the response to your payment request, and in the AUTHORISATION notification."
  const cancelOrRefundRequestObj = { originalReference: authorizationTransaction.interactionId }

  const interfaceInteraction = pU.getLatestInterfaceInteraction(
    paymentObject.interfaceInteractions, CTP_INTERACTION_TYPE_MAKE_PAYMENT
  )
  if (interfaceInteraction && pU.isValidJSON(interfaceInteraction.fields.response)) {
    // OPTIONAL:
    // Specifies a unique identifier for payment modification.
    // The reference field is useful to tag a partial cancel or refund for future reconciliation.
    const makePaymentResponse = JSON.parse(interfaceInteraction.fields.response)
    if (makePaymentResponse.merchantReference)
      cancelOrRefundRequestObj.reference = makePaymentResponse.merchantReference
  }

  return cancelOrRefund(cancelOrRefundRequestObj)
}

function getTransactionActions (paymentObject, pspReference) {
  const cancelTransaction = pU.getCancelAuthorizationTransactionInit(paymentObject)
  const refundTransaction = pU.getRefundTransactionInit(paymentObject)
  let transactionId
  if (cancelTransaction)
    transactionId = cancelTransaction.id
  else if (refundTransaction)
    transactionId = refundTransaction.id

  return [
    pU.createChangeTransactionStateAction(transactionId, 'Pending'),
    pU.createChangeTransactionInteractionId(transactionId, pspReference)
  ]
}

module.exports = { execute }
