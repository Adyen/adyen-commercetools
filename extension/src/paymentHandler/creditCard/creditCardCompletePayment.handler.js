const fetch = require('node-fetch')
const _ = require('lodash')

const configLoader = require('../../config/config')
const c = require('../../config/constants')
const pU = require('../payment-utils')
const Validator = require('../../validator/validator')

const config = configLoader.load()

async function handlePayment (paymentObject) {
  const validator = _validatePayment(paymentObject)
  if (validator.hasErrors())
    return validator.buildCtpErrorResponse()
  const { response, request } = await _completePayment(paymentObject)
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
  if (body.resultCode) {
    const transaction = pU.getChargeTransactionPending(paymentObject)
    actions.push({
      action: 'changeTransactionState',
      transactionId: transaction.id,
      state: _.capitalize(pU.getMatchingCtpState(body.resultCode.toLowerCase()))
    })
    if (body.pspReference)
      actions.push({
        action: 'changeTransactionInteractionId',
        transactionId: transaction.id,
        interactionId: body.pspReference
      })
  }
  return {
    version: paymentObject.version,
    actions
  }
}

function _validatePayment (paymentObject) {
  return Validator.validate(paymentObject)
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
