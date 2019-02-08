const fetch = require('node-fetch')
const configLoader = require('../../config/config')
const c = require('../../config/constants')

const config = configLoader.load()

// see https://docs.adyen.com/developers/payments-basics/payments-lifecycle
// and https://docs.adyen.com/developers/checkout/payment-result-codes
const paymentAdyenStateToCtpState = {
  redirectshopper: 'Pending',
  received: 'Pending',
  pending: 'Pending',
  authorised: 'Success',
  refused: 'Failure',
  cancelled: 'Failure',
  error: 'Failure'
}

function isSupported (paymentObject) {
  const hasMakePaymentInteraction = paymentObject.interfaceInteractions
    .some(i => i.fields.type === 'makePayment')
  return !hasMakePaymentInteraction
    && paymentObject.paymentMethodInfo.paymentInterface === 'ctp-adyen-integration'
    && paymentObject.paymentMethodInfo.method === 'creditCard'
}

async function handlePayment (paymentObject) {
  const response = await makePayment(paymentObject)
  // for statusCodes, see https://docs.adyen.com/developers/development-resources/response-handling
  const interfaceInteractionStatus = response.status === 200 ? c.SUCCESS : c.FAILURE
  const body = await response.json()
  const actions = [
    {
      action: 'addInterfaceInteraction',
      type: { key: c.CTP_INTERFACE_INTERACTION_RESPONSE },
      fields: {
        timestamp: new Date(),
        response: JSON.stringify(body),
        type: 'makePayment',
        status: interfaceInteractionStatus
      }
    }
  ]
  if (body.pspReference)
    actions.push({
      action: 'setInterfaceId',
      interfaceId: body.pspReference
    })
  if (body.resultCode) {
    const resultCode = body.resultCode.toLowerCase()
    if (resultCode === c.REDIRECT_SHOPPER.toLowerCase()) {
      const { MD } = body.redirect.data
      actions.push({
        action: 'setCustomField',
        name: 'MD',
        value: MD
      })
      const { PaReq } = body.redirect.data
      actions.push({
        action: 'setCustomField',
        name: 'PaReq',
        value: PaReq
      })
      const { paymentData } = body
      actions.push({
        action: 'setCustomField',
        name: 'paymentData',
        value: paymentData
      })
    }
    actions.push({
      action: 'addTransaction',
      transaction: {
        type: 'Charge',
        amount: {
          currencyCode: paymentObject.amountPlanned.currencyCode,
          centAmount: paymentObject.amountPlanned.centAmount
        },
        state: paymentAdyenStateToCtpState[body.resultCode.toLowerCase()]
      }
    })
  }
  return {
    version: paymentObject.version,
    actions
  }
}

async function makePayment (paymentObject) {
  const body = {
    amount: {
      currency: paymentObject.amountPlanned.currencyCode,
      value: paymentObject.amountPlanned.centAmount
    },
    reference: paymentObject.id,
    paymentMethod: {
      type: 'scheme',
      encryptedCardNumber: paymentObject.custom.fields.encryptedCardNumber,
      encryptedExpiryMonth: paymentObject.custom.fields.encryptedExpiryMonth,
      encryptedExpiryYear: paymentObject.custom.fields.encryptedExpiryYear,
      encryptedSecurityCode: paymentObject.custom.fields.encryptedSecurityCode
    },
    returnUrl: paymentObject.custom.fields.returnUrl,
    merchantAccount: config.adyen.merchantAccount
  }
  if (paymentObject.custom.fields.holderName)
    body.holderName = paymentObject.custom.fields.holderName
  if (paymentObject.custom.fields.executeThreeD)
    body.additionalData = {
      executeThreeD: paymentObject.custom.fields.executeThreeD.toString()
    }
  if (paymentObject.custom.fields.browserInfo) {
    const browserInfo = JSON.parse(paymentObject.custom.fields.browserInfo)
    body.browserInfo = browserInfo
  }
  const response = await fetch(`${config.adyen.apiBaseUrl}/payments`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-api-key': config.adyen.apiKey, 'Content-Type': 'application/json' }
  })

  return response
}

module.exports = { isSupported, handlePayment }
