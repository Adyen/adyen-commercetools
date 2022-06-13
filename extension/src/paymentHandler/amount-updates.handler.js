import { updateAmount } from '../service/web-component-service.js'
import {
  createAddInterfaceInteractionAction,
  createSetCustomFieldAction,
} from './payment-utils.js'
import c from '../config/constants.js'

async function execute(paymentObject) {
  const amountUpdatesRequestObj = JSON.parse(
    paymentObject.custom.fields.amountUpdatesRequest
  )
  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const commercetoolsProjectKey = paymentObject.custom.fields.commercetoolsProjectKey
  const { request, response } = await updateAmount(
    adyenMerchantAccount,
    commercetoolsProjectKey,
    amountUpdatesRequestObj
  )
  return {
    actions: [
      createAddInterfaceInteractionAction({
        request,
        response,
        type: c.CTP_INTERACTION_TYPE_AMOUNT_UPDATES,
      }),
      createSetCustomFieldAction(
        c.CTP_CUSTOM_FIELD_AMOUNT_UPDATES_RESPONSE,
        response
      ),
    ],
  }
}

export default { execute }
