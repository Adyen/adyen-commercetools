const _ = require('lodash')
const fetch = require('node-fetch')

const pU = require('../payment-utils')
const c = require('../../config/constants')
const configLoader = require('../../config/config')

const config = configLoader.load()

function isSupported (paymentObject) {
  const isAdyen = paymentObject.paymentMethodInfo.paymentInterface === 'ctp-adyen-integration'
  const isPaypal = paymentObject.paymentMethodInfo.method === 'paypal'
  const transaction = pU.getChargeTransactionPending(paymentObject)
  const hasTransaction = _.isObject(transaction)
  const hasPayload = !_.isNil(paymentObject.custom.fields.payload)
  return isAdyen
    && isPaypal
    && hasTransaction
    && hasPayload
}

async function handlePayment (paymentObject) {
  const { response, request } = await _callAdyen(paymentObject)
  const interfaceInteractionStatus = response.status === 200 ? c.SUCCESS : c.FAILURE
  const responseBody = await response.json()
  const actions = [
    {
      action: 'addInterfaceInteraction',
      type: { key: c.CTP_INTERFACE_INTERACTION },
      fields: {
        timestamp: new Date(),
        response: JSON.stringify(responseBody),
        request: JSON.stringify(request),
        type: 'makePayment',
        status: interfaceInteractionStatus
      }
    }
  ]
  if (responseBody.resultCode) {
    const transaction = pU.getChargeTransactionPending(paymentObject)
    actions.push({
      action: 'changeTransactionState',
      transactionId: transaction.id,
      state: _.capitalize(pU.getMatchingCtpState(responseBody.resultCode.toLowerCase()))
    })
    if (responseBody.pspReference)
      actions.push({
        action: 'changeTransactionInteractionId',
        transactionId: transaction.id,
        interactionId: responseBody.pspReference
      })
  }
  return {
    version: paymentObject.version,
    actions
  }
}

async function _callAdyen (paymentObject) {
  const body = {
    details: {
      payload: paymentObject.custom.fields.payload
    }
  }

  const request = {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-api-key': config.adyen.apiKey, 'Content-Type': 'application/json' }
  }
  const resultPromise = await fetch(`${config.adyen.apiBaseUrl}/payments/details`, request)

  return { response: await resultPromise, request }
}

module.exports = { handlePayment, isSupported }
