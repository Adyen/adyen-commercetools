import {
  createAddInterfaceInteractionAction,
  createSetCustomFieldAction,
} from './payment-utils.js'
import c from '../config/constants.js'
import { getPaymentMethods } from '../service/web-component-service.js'

async function execute(paymentObject) {
  const getPaymentMethodsRequestObj = JSON.parse(
    paymentObject.custom.fields.getPaymentMethodsRequest,
  )
  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const { request, response } = await getPaymentMethods(
    adyenMerchantAccount,
    getPaymentMethodsRequestObj,
  )
  return {
    actions: [
      createAddInterfaceInteractionAction({
        request,
        response,
        type: c.CTP_INTERACTION_TYPE_GET_PAYMENT_METHODS,
      }),
      createSetCustomFieldAction(
        c.CTP_CUSTOM_FIELD_GET_PAYMENT_METHODS_RESPONSE,
        response,
      ),
    ],
  }
}

export default { execute }
