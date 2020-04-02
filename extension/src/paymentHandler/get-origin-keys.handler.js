const pU = require('./payment-utils')
const c = require('../config/constants')
const { getOriginKeys } = require('./web-component-service')

async function handlePayment (paymentObject) {
  // todo(ahmet): validate
  const { request, response } = await getOriginKeys(paymentObject)
  return {
    actions: [
      pU.createAddInterfaceInteractionAction({
        request, response, type: c.CTP_INTERACTION_TYPE_GET_ORIGIN_KEYS
      }),
      pU.createSetCustomFieldAction(c.CTP_CUSTOM_FIELD_GET_ORIGIN_KEYS_RESPONSE, response)
    ]
  }
}

module.exports = { handlePayment }
