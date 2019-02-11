const fetch = require('node-fetch')

const configLoader = require('../../config/config')
const c = require('../../config/constants')

const config = configLoader.load()

function isSupported (paymentObject) {
  const hasMakePaymentInteraction = paymentObject.interfaceInteractions
    .some(i => i.fields.type === 'makePayment' && i.fields.status === c.SUCCESS)
  const hasPendingTransaction = paymentObject.transactions
    .some(t => t.type === 'Charge' && t.state === 'Pending')
  return hasMakePaymentInteraction
    && hasPendingTransaction
    && paymentObject.paymentMethodInfo.paymentInterface === 'ctp-adyen-integration'
    && paymentObject.paymentMethodInfo.method === 'creditCard'
}

async function handlePayment (paymentObject) {
  const { response, request } = await completePayment(paymentObject)
  const interfaceInteractionStatus = response.status === 200 ? c.SUCCESS : c.FAILURE
  const body = await response.json()
  const actions = [
    {
      action: 'addInterfaceInteraction',
      type: { key: c.CTP_INTERFACE_INTERACTION },
      fields: {
        timestamp: new Date(),
        response: JSON.stringify(body),
        request: JSON.stringify(request),
        type: 'completePayment',
        status: interfaceInteractionStatus
      }
    }
  ]
  if (body.pspReference)
    actions.push({
      action: 'setInterfaceId',
      interfaceId: body.pspReference
    })
  return {
    version: paymentObject.version,
    actions
  }
}

async function completePayment (paymentObject) {
  const body = {
    paymentData: paymentObject.custom.fields.paymentData,
    details: {
      MD: paymentObject.custom.fields.MD,
      PaRes: paymentObject.custom.fields.PaRes
    }
  }
  const request = {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-api-key': config.adyen.apiKey, 'Content-Type': 'application/json' }
  }
  const response = await fetch(`${config.adyen.apiBaseUrl}/payments/details`, request)

  return { request, response }
}

module.exports = { isSupported, handlePayment }
