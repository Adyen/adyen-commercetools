import {
  createAddInterfaceInteractionAction,
  createSetCustomFieldAction,
} from './payment-utils.js'
import c from '../config/constants.js'
import { createSessionRequest } from '../service/web-component-service.js'

async function execute(paymentObject) {
  const createSessionRequestObj = JSON.parse(
    paymentObject.custom.fields.createSessionRequest,
  )
  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const commercetoolsProjectKey =
    paymentObject.custom.fields.commercetoolsProjectKey
  const { request, response } = await createSessionRequest(
    adyenMerchantAccount,
    commercetoolsProjectKey,
    createSessionRequestObj,
  )

  const actions = [
    createAddInterfaceInteractionAction({
      request,
      response,
      type: c.CTP_INTERACTION_TYPE_CREATE_SESSION,
    }),
    createSetCustomFieldAction(
      c.CTP_INTERACTION_TYPE_CREATE_SESSION_RESPONSE,
      response,
    ),
  ]

  const requestBodyJson = JSON.parse(request.body)
  const paymentKey = paymentObject.key
  // ensure the key is a string, otherwise the error with "code": "InvalidJsonInput" will return by commercetools API.
  const reference = requestBodyJson.reference?.toString()
  // ensure the key and new reference is different, otherwise the error with
  // "code": "InvalidOperation", "message": "'key' has no changes." will return by commercetools API.
  if (reference !== paymentKey)
    actions.push({
      action: 'setKey',
      key: reference,
    })

  return {
    actions,
  }
}

export default { execute }
