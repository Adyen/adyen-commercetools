import { updateAmount } from '../service/web-component-service.js'
import {
  createAddInterfaceInteractionAction,
  createSetCustomFieldAction,
} from './payment-utils.js'
import c from '../config/constants.js'

async function execute(paymentObject) {
  const amountUpdatesRequestObj = JSON.parse(
    paymentObject.custom.fields.amountUpdatesRequest,
  )

  // Adjust request for older API version reason field.
  if (amountUpdatesRequestObj.reason) {
    amountUpdatesRequestObj.industryUsage =
      amountUpdatesRequestObj.reason.charAt(0).toLowerCase() +
      amountUpdatesRequestObj.reason.slice(1)

    delete amountUpdatesRequestObj.reason
  }

  if (
    !['delayedCharge', 'noShow', 'installment'].includes(
      amountUpdatesRequestObj.industryUsage,
    )
  ) {
    delete amountUpdatesRequestObj.industryUsage
  }

  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const commercetoolsProjectKey =
    paymentObject.custom.fields.commercetoolsProjectKey
  const { request, response } = await updateAmount(
    adyenMerchantAccount,
    commercetoolsProjectKey,
    amountUpdatesRequestObj,
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
        response,
      ),
    ],
  }
}

export default { execute }
