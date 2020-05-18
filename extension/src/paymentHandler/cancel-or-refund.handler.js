const { isEmpty } = require('lodash')
const pU = require('./payment-utils')
const {cancelOrRefund} = require('../web-component-service')

const {
  CTP_INTERACTION_TYPE_MAKE_PAYMENT,
  CTP_INTERACTION_TYPE_CANCEL_OR_REFUND,
  CTP_TXN_STATE_PENDING,
} = require('../config/constants')

async function execute(paymentObject) {
  const {request, response} = await _cancelOrRefundPayment(paymentObject)

  const actions = [
    pU.createAddInterfaceInteractionAction({
      request, response, type: CTP_INTERACTION_TYPE_CANCEL_OR_REFUND
    })
  ]
  if (!isEmpty(response.pspReference))
    return { actions }

  const cancelTransaction = pU.getCancelAuthorizationTransactionInit(paymentObject)
  const refundTransaction = pU.getRefundTransactionInit(paymentObject)
  if (cancelTransaction)
    actions.push(
      pU.createChangeTransactionStateAction(cancelTransaction.id, CTP_TXN_STATE_PENDING)
    )
  else if (refundTransaction)
    actions.push(
      pU.createChangeTransactionStateAction(refundTransaction.id, CTP_TXN_STATE_PENDING)
    )

  return { actions }
}

async function _cancelOrRefundPayment(paymentObject) {
  const authorizationTransaction = pU.getAuthorizationTransactionSuccess(paymentObject)
  // "originalReference: The original pspReference of the payment that you want to cancel or refund.
  // This reference is returned in the response to your payment request, and in the AUTHORISATION notification."
  const cancelOrRefundRequestObj = {originalReferenc2e: authorizationTransaction.interactionId}

  const interfaceInteraction = paymentObject.interfaceInteractions
    .find(interaction => interaction.fields.type === CTP_INTERACTION_TYPE_MAKE_PAYMENT)
  if (interfaceInteraction && !isEmpty(interfaceInteraction.fields.response)) {
    // OPTIONAL:
    // Specifies a unique identifier for payment modification.
    // The reference field is useful to tag a partial cancel or refund for future reconciliation.
    const makePaymentResponse = JSON.parse(interfaceInteraction.fields.response)
    cancelOrRefundRequestObj.reference = makePaymentResponse.merchantReference
  }

  return cancelOrRefund(cancelOrRefundRequestObj)
}

module.exports = {execute}
