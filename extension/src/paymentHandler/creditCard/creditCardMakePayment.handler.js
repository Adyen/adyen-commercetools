const fetch = require('node-fetch')
const configLoader = require('../../config/config')
const c = require('../../config/constants')

const config = configLoader.load()

function isSupported (paymentObject) {
  return paymentObject.paymentMethodInfo.paymentInterface === 'ctp-adyen-integration'
    && paymentObject.paymentMethodInfo.method === 'creditCard'
}

async function handlePayment (paymentObject) {
  const result = await makePayment(paymentObject)
  return {
    version: paymentObject.version,
    actions: [
      {
        action: 'setInterfaceId',
        interfaceId: result.pspReference
      },
      {
        action: 'addInterfaceInteraction',
        type: { key: c.CTP_INTERFACE_INTERACTION_RESPONSE },
        fields: {
          timestamp: new Date(),
          response: JSON.stringify(result),
          type: 'makePayment',
          status: c.SUCCESS
        }
      }
    ]
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
  const resultPromise = await fetch(`${config.adyen.apiBaseUrl}/payments`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-api-key': config.adyen.apiKey, 'Content-Type': 'application/json' }
  })

  return resultPromise.json()
}

module.exports = { isSupported, handlePayment }
