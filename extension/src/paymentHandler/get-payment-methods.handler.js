const pU = require('./payment-utils')
const c = require('../config/constants')
const { getPaymentMethods } = require('./web-component-service')

async function handlePayment (paymentObject) {
  const getPaymentMethodsRequest = paymentObject.custom.fields.getPaymentMethodsRequest
  const { request, response } = await getPaymentMethods(getPaymentMethodsRequest)
  return {
    actions: [
      pU.createAddInterfaceInteractionAction({
        request, response, type: c.CTP_INTERACTION_TYPE_GET_PAYMENT_METHODS
      }),
      pU.createSetCustomFieldAction(c.CTP_CUSTOM_FIELD_GET_PAYMENT_METHODS_RESPONSE, response)
    ]
  }
}

module.exports = { handlePayment }
