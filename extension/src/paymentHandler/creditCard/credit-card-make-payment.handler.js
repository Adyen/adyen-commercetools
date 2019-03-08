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
  if (body.resultCode) {
    const transaction = pU.getChargeTransactionInit(paymentObject)
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
      const redirectUrl = body.redirect.url
      actions.push({
        action: 'setCustomField',
        name: 'redirectUrl',
        value: redirectUrl
      })
      const redirectMethod = body.redirect.method
      actions.push({
        action: 'setCustomField',
        name: 'redirectMethod',
        value: redirectMethod
      })
      actions.push({
        action: 'changeTransactionState',
        transactionId: transaction.id,
        state: 'Pending'
      })
    } else {
      const newTxnState = _.capitalize(pU.getMatchingCtpState(body.resultCode.toLowerCase()))
      if (newTxnState !== transaction.state)
        actions.push({
          action: 'changeTransactionState',
          transactionId: transaction.id,
          state: newTxnState
        })
      if (body.pspReference)
        actions.push({
          action: 'changeTransactionInteractionId',
          transactionId: transaction.id,
          interactionId: body.pspReference
        })
    }
  }
  return {
    version: paymentObject.version,
    actions
  }
}

function _validatePayment (paymentObject) {
  return ValidatorBuilder.withPayment(paymentObject)
    .validateEncryptedCardNumberField()
    .validateEncryptedExpiryMonthField()
    .validateEncryptedExpiryYearField()
    .validateEncryptedSecurityCodeField()
    .validateReturnUrlField()
}

async function _makePayment (paymentObject) {
  const transaction = pU.getChargeTransactionInitOrPending(paymentObject)
  const body = {
    amount: {
      currency: transaction.amount.currencyCode,
      value: transaction.amount.centAmount
    },
    reference: paymentObject.interfaceId,
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
  if (paymentObject.paymentMethodInfo.method === 'creditCard_3d')
    body.additionalData = {
      executeThreeD: 'true'
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
  const response = await fetch(`${config.adyen.apiBaseUrl}/payments`, request)

  return { response, request }
}

module.exports = { handlePayment }
