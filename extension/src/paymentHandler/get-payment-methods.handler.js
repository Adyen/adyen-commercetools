const pU = require('./payment-utils')
const c = require('../config/constants')
const { getPaymentMethods } = require('../service/web-component-service')

async function execute(paymentObject) {
  const getPaymentMethodsRequestObj = JSON.parse(
    paymentObject.custom.fields.getPaymentMethodsRequest
  )
  const { request, response } = await getPaymentMethods(
    getPaymentMethodsRequestObj
  )
  return {
    actions: [
      pU.createAddInterfaceInteractionAction({
        request,
        response,
        type: c.CTP_INTERACTION_TYPE_GET_PAYMENT_METHODS,
      }),
      pU.createSetCustomFieldAction(
        c.CTP_CUSTOM_FIELD_GET_PAYMENT_METHODS_RESPONSE,
        response
      ),
    ],
  }
}

module.exports = { execute }
