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
  const status = response.status === 200 ? c.SUCCESS : c.FAILURE
  const responseBody = await response.json()
  let actions = [
    pU.ensureAddInterfaceInteractionAction({
      paymentObject, request, response: responseBody, type: 'makePayment', status
    })
  ]
  if (responseBody.resultCode) {
    const transaction = pU.getChargeTransactionInit(paymentObject)
    const resultCode = responseBody.resultCode.toLowerCase()
    if (resultCode === c.REDIRECT_SHOPPER.toLowerCase()) {
      const { MD } = responseBody.redirect.data
      actions.push(
        pU.createSetCustomFieldAction('MD', MD)
      )
      const { PaReq } = responseBody.redirect.data
      actions.push(
        pU.createSetCustomFieldAction('PaReq', PaReq)
      )
      const { paymentData } = responseBody
      actions.push(
        pU.createSetCustomFieldAction('paymentData', paymentData)
      )
      const redirectUrl = responseBody.redirect.url
      actions.push(
        pU.createSetCustomFieldAction('redirectUrl', redirectUrl)
      )
      const redirectMethod = responseBody.redirect.method
      actions.push(
        pU.createSetCustomFieldAction('redirectMethod', redirectMethod)
      )
      actions.push(
        pU.createChangeTransactionStateAction(transaction.id, c.CTP_TXN_STATE_PENDING)
      )
    } else {
      const newTxnState = _.capitalize(pU.getMatchingCtpState(responseBody.resultCode.toLowerCase()))
      if (newTxnState !== transaction.state)
        actions.push(
          pU.createChangeTransactionStateAction(transaction.id, newTxnState)
        )
      if (responseBody.pspReference)
      // in some cases (e.g. error response from Adyen), the body will not contain `pspReference`
        actions.push(
          pU.createChangeTransactionInteractionId(transaction.id, responseBody.pspReference)
        )
    }
  }

  actions = _.compact(actions)

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
