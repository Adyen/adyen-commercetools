const { makePayment } = require('../web-component-service')
const pU = require('./payment-utils')
const c = require('../config/constants')

async function execute (paymentObject) {
  const makePaymentRequestObj = JSON.parse(paymentObject.custom.fields.makePaymentRequest)
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
          paymentObject.amountPlanned.centAmount, paymentObject.amountPlanned.currencyCode,
          response.pspReference)
      )
      break
    case 'Refused':
    case 'Error':
      actions.push(
        pU.createAddTransactionAction('Authorization', 'Failure',
          paymentObject.amountPlanned.centAmount, paymentObject.amountPlanned.currencyCode,
          response.pspReference)
      )
      break
  }

  return {
    actions
  }
}

module.exports = { execute }
