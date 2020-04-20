const { makePayment } = require('../web-component-service')
const pU = require('./payment-utils')
const c = require('../config/constants')
const configLoader = require('../config/config')

const config = configLoader.load()

async function execute (paymentObject) {
  const makePaymentRequestObj = JSON.parse(paymentObject.custom.fields.makePaymentRequest)
  enrichRequest(makePaymentRequestObj)
  // todo: check amount planned
  const { request, response } = await makePayment(makePaymentRequestObj)
  const actions = [
    pU.createAddInterfaceInteractionAction({
      request, response, type: c.CTP_INTERACTION_TYPE_MAKE_PAYMENT
    }),
    pU.createSetCustomFieldAction(c.CTP_CUSTOM_FIELD_MAKE_PAYMENT_RESPONSE, response)
  ]

  // eslint-disable-next-line default-case
  switch (response.resultCode) {
    case 'Authorised':
      actions.push(
        pU.createAddTransactionAction('Authorization', 'Success',
          paymentObject.amountPlanned.centAmount, paymentObject.amountPlanned.currencyCode)
      )
      break
    // todo: is Cancelled also failure?
    // eslint-disable-next-line max-len
    // Cancelled – Indicates the payment has been cancelled (either by the shopper or the merchant) before processing was completed. This is a final state.
    case 'Refused':
    case 'Error':
      actions.push(
        pU.createAddTransactionAction('Authorization', 'Failure',
          paymentObject.amountPlanned.centAmount, paymentObject.amountPlanned.currencyCode)
      )
      break
  }

  return {
    actions
  }
}

function enrichRequest (makePaymentRequestObj) {
  makePaymentRequestObj.merchantAccount = config.adyen.merchantAccount
}

module.exports = { execute }
