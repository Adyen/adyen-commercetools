import {
  createAddInterfaceInteractionAction,
  createSetCustomFieldAction,
  getMerchantReferenceCustomFieldUpdateAction,
  getPaymentKeyUpdateAction,
  generateIdempotencyKey,
} from './payment-utils.js'
import c from '../config/constants.js'
import { createSessionRequest } from '../service/web-component-service.js'
import mappingCartDataUtils from './mapping-cart-data-utils.js'

async function execute(paymentObject) {
  let createSessionRequestObj = JSON.parse(
    paymentObject.custom.fields.createSessionRequest,
  )
  const commercetoolsProjectKey =
    paymentObject.custom.fields.commercetoolsProjectKey

  createSessionRequestObj = await mappingCartDataUtils.getDataFromCart(
    createSessionRequestObj,
    paymentObject,
    commercetoolsProjectKey,
  )

  createSessionRequestObj.shopperIP = paymentObject.shopperIP
  paymentObject.custom.fields.createSessionRequest = JSON.stringify(
    createSessionRequestObj,
  )

  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const idempotencyKey = generateIdempotencyKey({
    paymentObject,
    operation: 'createSession',
    requestPayload: createSessionRequestObj,
  })

  const { request, response } = await createSessionRequest(
    adyenMerchantAccount,
    commercetoolsProjectKey,
    createSessionRequestObj,
    idempotencyKey,
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

  const updatePaymentAction = getPaymentKeyUpdateAction(
    paymentObject.key,
    response,
  )
  if (updatePaymentAction) actions.push(updatePaymentAction)

  const updateMerchantReferenceCustomFieldAction =
    getMerchantReferenceCustomFieldUpdateAction(
      request,
      c.CTP_CUSTOM_FIELD_MERCHANT_REFERENCE,
    )
  if (updateMerchantReferenceCustomFieldAction)
    actions.push(updateMerchantReferenceCustomFieldAction)

  return {
    actions,
  }
}

export default { execute }
