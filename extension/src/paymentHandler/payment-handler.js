const _ = require('lodash')
const ValidatorBuilder = require('../validator/validator-builder')
const getPaymentMethodsHandler = require('./get-payment-methods.handler')
const getOriginKeysHandler = require('./get-origin-keys.handler')
const makePaymentHandler = require('./make-payment.handler')
const submitPaymentDetailsHandler = require('./submit-payment-details.handler')
const { CTP_ADYEN_INTEGRATION, CTP_INTERACTION_TYPE_SUBMIT_ADDITIONAL_PAYMENT_DETAILS } = require('../config/constants')


async function handlePayment (paymentObject) {
  if (!_isAdyenPayment(paymentObject))
    // if it's not adyen payment, ignore the payment
    return { success: true, data: null }

  const paymentValidator = ValidatorBuilder.withPayment(paymentObject).validateRequestFields()
  if (paymentValidator.hasErrors())
    return {
      success: false,
      data: paymentValidator.buildCtpErrorResponse()
    }

  const handlers = _getPaymentHandlers(paymentObject)
  const handlerResponses = await Promise.all(
    handlers.map(handler => handler.execute(paymentObject))
  )
  const handlerResponse = {
    actions: handlerResponses.flatMap(result => result.actions)
  }
  return { success: true, data: handlerResponse }
}

function _getPaymentHandlers (paymentObject) {
  // custom field on payment is not a mandatory field.
  if (!paymentObject.custom)
    return []

  const handlers = []
  if (paymentObject.custom.fields.getOriginKeysRequest && !paymentObject.custom.fields.getOriginKeysResponse)
    handlers.push(getOriginKeysHandler)
  if (paymentObject.custom.fields.getPaymentMethodsRequest && !paymentObject.custom.fields.getPaymentMethodsResponse)
    handlers.push(getPaymentMethodsHandler)
  if (paymentObject.custom.fields.makePaymentRequest && !paymentObject.custom.fields.makePaymentResponse)
    handlers.push(makePaymentHandler)
  if (paymentObject.custom.fields.makePaymentResponse
    && paymentObject.custom.fields.submitAdditionalPaymentDetailsRequest
    && isSubmitAdditionalPaymentDetailsRequestNew(paymentObject))
    handlers.push(submitPaymentDetailsHandler)
  return handlers
}

function isSubmitAdditionalPaymentDetailsRequestNew (paymentObject) {
  const interfaceInteraction = paymentObject.interfaceInteractions
    .find(interaction => interaction.fields.type === CTP_INTERACTION_TYPE_SUBMIT_ADDITIONAL_PAYMENT_DETAILS)
  if (interfaceInteraction) {
    const oldSubmitDetailsRequest = interfaceInteraction.fields.request
    if (oldSubmitDetailsRequest) {
      const oldSubmitDetailsRequestObj = JSON.parse(oldSubmitDetailsRequest)
      const newSubmitDetailsRequestObj = JSON.parse(paymentObject.custom.fields.submitAdditionalPaymentDetailsRequest)
      if (!_.isEqual(oldSubmitDetailsRequestObj, newSubmitDetailsRequestObj))
        // request is new if new and old requests are different
        return true
    }
  } else
    // request is new if there are no requests yet
    return true
  return false
}

function _isAdyenPayment (paymentObject) {
  return paymentObject.paymentMethodInfo.paymentInterface === CTP_ADYEN_INTEGRATION
}

module.exports = { handlePayment }
