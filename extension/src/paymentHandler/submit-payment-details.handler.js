const { submitAdditionalPaymentDetails } = require('../web-component-service')
const pU = require('./payment-utils')
const c = require('../config/constants')

async function execute (paymentObject) {
  const submitAdditionalDetailsRequestObj
    = JSON.parse(paymentObject.custom.fields.submitAdditionalPaymentDetailsRequest)
  if (!submitAdditionalDetailsRequestObj.paymentData) {
    const makePaymentResponseObj = JSON.parse(paymentObject.custom.fields.makePaymentResponse)
    submitAdditionalDetailsRequestObj.paymentData = makePaymentResponseObj.paymentData
  }
  const { request, response } = await submitAdditionalPaymentDetails(submitAdditionalDetailsRequestObj)
  const actions = [
    pU.createAddInterfaceInteractionAction({
      request, response, type: c.CTP_INTERACTION_TYPE_SUBMIT_PAYMENT_DETAILS
    }),
    pU.createSetCustomFieldAction(c.CTP_CUSTOM_FIELD_SUBMIT_PAYMENT_DETAILS_RESPONSE, response)
  ]

  const addTransactionAction = pU.createAddTransactionActionByResponse(
    paymentObject.amountPlanned.centAmount,
    paymentObject.amountPlanned.currencyCode,
    response
  )

  if (addTransactionAction)
    actions.push(addTransactionAction)

  return {
    actions
  }
}

module.exports = { execute }
