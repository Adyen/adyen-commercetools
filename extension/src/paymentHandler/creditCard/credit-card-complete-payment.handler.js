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
    return validator.buildCtpErrorResponse()
  const { response, request } = await _completePayment(paymentObject)
  const status = response.status === 200 ? c.SUCCESS : c.FAILURE
  const responseBody = await response.json()
  const actions = [
    pU.createAddInterfaceInteractionAction({
      request, response: responseBody, type: 'completePayment', status
    })
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
