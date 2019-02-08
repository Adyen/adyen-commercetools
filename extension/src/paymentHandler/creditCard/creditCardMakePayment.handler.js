const fetch = require('node-fetch')
const _ = require('lodash')
const configLoader = require('../../config/config')
const c = require('../../config/constants')

const config = configLoader.load()

const paymentAdyenStateToCtpState = {
  redirectShopper: 'Pending',
  received: 'Pending',
  pending: 'Pending',
  authorised: 'Success',
  refused: 'Failure',
  cancelled: 'Failure',
  error: 'Failure'
}

function isSupported (paymentObject) {
  const isAdyen = paymentObject.paymentMethodInfo.paymentInterface === 'ctp-adyen-integration'
  const isCreditCard = paymentObject.paymentMethodInfo.method === 'creditCard'
  const hasReferenceField = !_.isNil(paymentObject.custom.fields.reference)
  return isAdyen && isCreditCard && hasReferenceField
}

async function handlePayment (paymentObject) {
  const result = await makePayment(paymentObject)
  // for statusCodes, see https://docs.adyen.com/developers/development-resources/response-handling
  const interfaceInteractionStatus = result.status === 200 ? c.SUCCESS : c.FAILURE
  const actions = [
    {
      action: 'addInterfaceInteraction',
      type: { key: c.CTP_INTERFACE_INTERACTION_RESPONSE },
      fields: {
        timestamp: new Date(),
        response: JSON.stringify(result),
        type: 'makePayment',
        status: interfaceInteractionStatus
      }
    }
  ]
  if (result.pspReference)
    actions.push({
      action: 'setInterfaceId',
      interfaceId: result.pspReference
    })
  if (result.resultCode)
    actions.push({
      action: 'addTransaction',
      transaction: {
        type: 'Charge',
        amount: {
          currencyCode: paymentObject.amountPlanned.currencyCode,
          centAmount: paymentObject.amountPlanned.centAmount
        },
        state: paymentAdyenStateToCtpState[result.resultCode.toLowerCase()]
      }
    })
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
    reference: paymentObject.custom.fields.reference,
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
