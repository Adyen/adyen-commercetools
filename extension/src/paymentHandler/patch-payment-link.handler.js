const { patchPaymentLink } = require('../service/web-component-service')
const pU = require('./payment-utils')
const c = require('../config/constants')

async function execute(paymentObject) {
  const patchPaymentLinkRequestObj = JSON.parse(
    paymentObject.custom.fields.patchPaymentLinkRequest
  )
  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const commercetoolsProjectKey =
    paymentObject.custom.fields.commercetoolsProjectKey;

  const { request, response } = await patchPaymentLink(
    adyenMerchantAccount,
    commercetoolsProjectKey,
    patchPaymentLinkRequestObj
  )
  const actions = [
    pU.createAddInterfaceInteractionAction({
      request,
      response,
      type: c.CTP_INTERACTION_TYPE_PATCH_PAYMENT_LINK,
    }),
    pU.createSetCustomFieldAction(
      c.CTP_CUSTOM_FIELD_PATCH_PAYMENT_LINK_RESPONSE,
      response
    ),
  ]

  return {
    actions,
  }
}

module.exports = { execute }
