const fetch = require('node-fetch')
const configLoader = require('../config/config')
const pU = require('../paymentHandler/payment-utils')
const c = require('../config/constants')

const config = configLoader.load()

async function handlePayment (paymentObject) {
  const { request, response } = await _cancelOrRefundPayment(paymentObject)
  const status = response.status === 200 ? c.SUCCESS : c.FAILURE
  const responseBody = await response.json()
  const actions = [
    pU.ensureAddInterfaceInteractionAction({
      paymentObject, request, response: responseBody, type: c.CTP_INTERACTION_TYPE_CANCEL_REFUND, status
    })
  ]
  if (status === c.SUCCESS) {
    const cancelTransaction = pU.getCancelAuthorizationTransactionInit(paymentObject)
    const refundTransaction = pU.getRefundTransactionInit(paymentObject)
    if (cancelTransaction)
      actions.push(
        pU.createChangeTransactionStateAction(cancelTransaction.id, c.CTP_TXN_STATE_PENDING)
      )
    else if (refundTransaction)
      actions.push(
        pU.createChangeTransactionStateAction(refundTransaction.id, c.CTP_TXN_STATE_PENDING)
      )
  }
  return { actions }
}

async function _cancelOrRefundPayment (paymentObject) {
  const transaction = pU.getChargeTransactionSuccess(paymentObject)
  const body = {
    merchantAccount: config.adyen.merchantAccount,
    originalReference: transaction.interactionId,
    reference: paymentObject.interfaceId
  }

  const request = {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-api-key': config.adyen.apiKey, 'Content-Type': 'application/json' }
  }
  const response = await fetch(`${config.adyen.legacyApiBaseUrl}/cancelOrRefund`, request)
  return { response, request }
}

module.exports = { handlePayment }
