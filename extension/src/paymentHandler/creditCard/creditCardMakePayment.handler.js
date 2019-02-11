const fetch = require('node-fetch')
const _ = require('lodash')
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
  const isAdyen = paymentObject.paymentMethodInfo.paymentInterface === 'ctp-adyen-integration'
  const isCreditCard = paymentObject.paymentMethodInfo.method === 'creditCard'
  const hasReferenceField = !_.isNil(paymentObject.custom.fields.reference)
  const transaction = _getTransaction(paymentObject)
  const hasTransaction = _.isObject(transaction)
  const hasMakePaymentInteraction = paymentObject.interfaceInteractions
    .some(i => i.fields.type === 'makePayment')
  return !hasMakePaymentInteraction
    && isAdyen
    && isCreditCard
    && hasReferenceField
    && hasTransaction
}

async function handlePayment (paymentObject) {
  const { request, response } = await _makePayment(paymentObject)
  // for statusCodes, see https://docs.adyen.com/developers/development-resources/response-handling
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
    const transaction = _getTransaction(paymentObject)
    actions.push({
      action: 'changeTransactionState',
      transactionId: transaction.id,
      state: _.capitalize(paymentAdyenStateToCtpState[body.resultCode.toLowerCase()])
    })
  }
  return {
    version: paymentObject.version,
    actions
  }
}

function _getTransaction (paymentObject) {
  return paymentObject.transactions.find(t => t.type.toLowerCase() === 'charge'
    && (t.state.toLowerCase() === 'initial' || t.state.toLowerCase() === 'pending'))
}

async function _makePayment (paymentObject) {
  const transaction = _getTransaction(paymentObject)
  const body = {
    amount: {
      currency: transaction.amount.currencyCode,
      value: transaction.amount.centAmount
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
  const request = {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-api-key': config.adyen.apiKey, 'Content-Type': 'application/json' }
  }
  const resultPromise = await fetch(`${config.adyen.apiBaseUrl}/payments`, request)

  return { response: await resultPromise, request }
}

module.exports = { isSupported, handlePayment }
