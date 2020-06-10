const pU = require('./payment-utils')
const { manualCapture } = require('../service/web-component-service')
const {
  CTP_INTERACTION_TYPE_MANUAL_CAPTURE,
  CTP_CUSTOM_FIELD_MANUAL_CAPTURE_RESPONSE
} = require('../config/constants')

async function execute (paymentObject) {
  const manualCaptureRequestObj = JSON.parse(paymentObject.custom.fields.manualCaptureRequest)
  const { request, response } = await manualCapture(manualCaptureRequestObj)
  return {
    actions: [
      pU.createAddInterfaceInteractionAction({
        request, response, type: CTP_INTERACTION_TYPE_MANUAL_CAPTURE
      }),
      pU.createSetCustomFieldAction(CTP_CUSTOM_FIELD_MANUAL_CAPTURE_RESPONSE, response)
    ]
  }
}

module.exports = { execute }
