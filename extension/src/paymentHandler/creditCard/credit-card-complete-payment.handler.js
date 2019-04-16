const fetch = require('node-fetch')
const _ = require('lodash')

const configLoader = require('../../config/config')
const c = require('../../config/constants')
const pU = require('../payment-utils')
const ValidatorBuilder = require('../../validator/validator-builder')

const config = configLoader.load()

async function handlePayment (paymentObject) {
  const validator = _validatePayment(paymentObject)
  if (validator.hasErrors())
    return {
      actions: []
    }
  const { response, request } = await _completePayment(paymentObject)
  const status = response.status === 200 ? c.SUCCESS : c.FAILURE
  const responseBody = await response.json()
  let actions = [
    pU.ensureAddInterfaceInteractionAction({
      paymentObject, request, response: responseBody, type: 'completePayment', status
    })
  ]
  if (responseBody.resultCode) {
    const transaction = pU.getChargeTransactionPending(paymentObject)
    const transactionState = pU.getMatchingCtpState(responseBody.resultCode.toLowerCase())
    actions.push(
      pU.createChangeTransactionStateAction(transaction.id, transactionState)
    )
    if (responseBody.pspReference)
      actions.push(
        pU.createChangeTransactionInteractionId(transaction.id, responseBody.pspReference)
      )
  }

  actions = _.compact(actions)

  return {
    actions
  }
}

function _validatePayment (paymentObject) {
  return ValidatorBuilder.withPayment(paymentObject)
    .validatePaymentDataField()
    .validateMdField()
    .validatePaResField()
}

async function _completePayment (paymentObject) {
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

module.exports = { handlePayment }
