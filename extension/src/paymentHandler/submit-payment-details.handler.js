const _ = require('lodash')
const {
  submitAdditionalPaymentDetails,
} = require('../service/web-component-service')
const pU = require('./payment-utils')
const c = require('../config/constants')
const {
  CTP_INTERACTION_TYPE_SUBMIT_ADDITIONAL_PAYMENT_DETAILS,
} = require('../config/constants')

async function execute(paymentObject) {
  const actions = []
  const submitAdditionalDetailsRequestObj = JSON.parse(
    paymentObject.custom.fields.submitAdditionalPaymentDetailsRequest
  )
  if (!submitAdditionalDetailsRequestObj.paymentData) {
    const makePaymentResponseObj = JSON.parse(
      paymentObject.custom.fields.makePaymentResponse
    )
    submitAdditionalDetailsRequestObj.paymentData =
      makePaymentResponseObj.paymentData
  }
  if (_isNewRequest(submitAdditionalDetailsRequestObj, paymentObject)) {
    const { request, response } = await submitAdditionalPaymentDetails(
      submitAdditionalDetailsRequestObj
    )
    actions.push(
      pU.createAddInterfaceInteractionAction({
        request,
        response,
        type: c.CTP_INTERACTION_TYPE_SUBMIT_ADDITIONAL_PAYMENT_DETAILS,
      }),
      pU.createSetCustomFieldAction(
        c.CTP_CUSTOM_FIELD_SUBMIT_ADDITIONAL_PAYMENT_DETAILS_RESPONSE,
        response
      )
    )

    const addTransactionAction = pU.createAddTransactionActionByResponse(
      paymentObject.amountPlanned.centAmount,
      paymentObject.amountPlanned.currencyCode,
      response
    )

    if (addTransactionAction) actions.push(addTransactionAction)
  }
  return {
    actions,
  }
}

function _isNewRequest(
  submitAdditionalPaymentDetailsRequestObj,
  paymentObject
) {
  const interfaceInteraction = paymentObject.interfaceInteractions.find(
    (interaction) =>
      interaction.fields.type ===
      CTP_INTERACTION_TYPE_SUBMIT_ADDITIONAL_PAYMENT_DETAILS
  )
  if (!interfaceInteraction)
    // request is new if there are no requests yet
    return true
  const oldSubmitDetailsRequest = interfaceInteraction.fields.request
  if (oldSubmitDetailsRequest) {
    const oldSubmitDetailsRequestObj = JSON.parse(oldSubmitDetailsRequest)
    const newSubmitDetailsRequestObj = _.cloneDeep(
      submitAdditionalPaymentDetailsRequestObj
    )
    delete newSubmitDetailsRequestObj.merchantAccount
    if (!_.isEqual(oldSubmitDetailsRequestObj, newSubmitDetailsRequestObj))
      // request is new if new and old requests are different
      return true
  }

  return false
}

module.exports = { execute }
