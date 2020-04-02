const pU = require('./payment-utils')
const c = require('../config/constants')
const { getPaymentMethods } = require('./web-component-service')

async function handlePayment (paymentObject) {
  // todo(ahmet): validate
  const { request, response } = await getPaymentMethods(paymentObject)
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
