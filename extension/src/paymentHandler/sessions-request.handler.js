import {
  createAddInterfaceInteractionAction,
  createSetCustomFieldAction,
} from './payment-utils.js'
import c from '../config/constants.js'
import { createSessionRequest } from '../service/web-component-service.js'

async function execute(paymentObject) {
  const createSessionRequestObj = JSON.parse(
    paymentObject.custom.fields.createSessionRequest
  )
  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const commercetoolsProjectKey =
    paymentObject.custom.fields.commercetoolsProjectKey
  const { request, response } = await createSessionRequest(
    adyenMerchantAccount,
    commercetoolsProjectKey,
    createSessionRequestObj
  )
  return {
    actions: [
      createAddInterfaceInteractionAction({
        request,
        response,
        type: c.CTP_INTERACTION_TYPE_CREATE_SESSION,
      }),
      createSetCustomFieldAction(
        c.CTP_INTERACTION_TYPE_CREATE_SESSION_RESPONSE,
        response
      ),
    ],
  }
}

export default { execute }
