import pU from './payment-utils'
import c from '../config/constants.mjs'
import componentService from '../service/web-component-service'

const { getPaymentMethods } = componentService

async function execute(paymentObject) {
  const getPaymentMethodsRequestObj = JSON.parse(
    paymentObject.custom.fields.getPaymentMethodsRequest
  )
  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const { request, response } = await getPaymentMethods(
    adyenMerchantAccount,
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

export default execute
