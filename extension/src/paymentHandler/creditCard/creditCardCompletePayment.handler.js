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
  const response = await completePayment(paymentObject)
  const interfaceInteractionStatus = response.status === 200 ? c.SUCCESS : c.FAILURE
  const body = await response.json()
  const actions = [
    {
      action: 'addInterfaceInteraction',
      type: { key: c.CTP_INTERFACE_INTERACTION_RESPONSE },
      fields: {
        timestamp: new Date(),
        response: JSON.stringify(body),
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
  const response = await fetch(`${config.adyen.apiBaseUrl}/payments/details`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-api-key': config.adyen.apiKey, 'Content-Type': 'application/json' }
  })

  return response
}

module.exports = { isSupported, handlePayment }
