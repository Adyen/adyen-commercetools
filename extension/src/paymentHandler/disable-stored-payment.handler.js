import { disableStoredPayment } from '../service/web-component-service.js'
import {
  createAddInterfaceInteractionAction,
  createSetCustomFieldAction,
} from './payment-utils.js'
import c from '../config/constants.js'

async function execute(paymentObject) {
  const disableStoredPaymentRequestObj = JSON.parse(
    paymentObject.custom.fields.disableStoredPaymentRequest,
  )
  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const { request, response } = await disableStoredPayment(
    adyenMerchantAccount,
    disableStoredPaymentRequestObj,
  )

  return {
    actions: [
      createAddInterfaceInteractionAction({
        request,
        response,
        type: c.CTP_INTERACTION_TYPE_DISABLE_STORED_PAYMENT,
      }),
      createSetCustomFieldAction(
        c.CTP_DISABLE_STORED_PAYMENT_RESPONSE,
        response,
      ),
    ],
  }
}

export default { execute }
