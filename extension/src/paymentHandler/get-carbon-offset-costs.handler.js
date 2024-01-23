import {
  createAddInterfaceInteractionAction,
  createSetCustomFieldAction,
} from './payment-utils.js'
import c from '../config/constants.js'
import { getCarbonOffsetCosts } from '../service/web-component-service.js'

async function execute(paymentObject) {
  const getCarbonOffsetCostsRequestObj = JSON.parse(
    paymentObject.custom.fields.getCarbonOffsetCostsRequest,
  )
  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const { request, response } = await getCarbonOffsetCosts(
    adyenMerchantAccount,
    getCarbonOffsetCostsRequestObj,
  )
  return {
    actions: [
      createAddInterfaceInteractionAction({
        request,
        response,
        type: c.CTP_INTERACTION_TYPE_GET_CARBON_OFFSET_COSTS,
      }),
      createSetCustomFieldAction(c.CTP_CARBON_OFFSET_COSTS_RESPONSE, response),
    ],
  }
}

export default { execute }
