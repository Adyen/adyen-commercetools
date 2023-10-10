import {
  createAddInterfaceInteractionAction,
  createSetCustomFieldAction,
  createSetMethodInfoMethodAction,
  createSetMethodInfoNameAction,
  createAddTransactionActionByResponse,
  getPaymentKeyUpdateAction,
} from './payment-utils.js'
import c from '../config/constants.js'
import { makePayment } from '../service/web-component-service.js'

async function execute(paymentObject) {
  const makePaymentRequestObj = JSON.parse(
    paymentObject.custom.fields.makePaymentRequest,
  )
  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const commercetoolsProjectKey =
    paymentObject.custom.fields.commercetoolsProjectKey
  const { request, response } = await makePayment(
    adyenMerchantAccount,
    commercetoolsProjectKey,
    makePaymentRequestObj,
  )
  const actions = [
    createAddInterfaceInteractionAction({
      request,
      response,
      type: c.CTP_INTERACTION_TYPE_MAKE_PAYMENT,
    }),
    createSetCustomFieldAction(
      c.CTP_CUSTOM_FIELD_MAKE_PAYMENT_RESPONSE,
      response,
    ),
  ]

  const requestBodyJson = JSON.parse(request.body)
  const paymentMethod = requestBodyJson?.paymentMethod?.type
  if (paymentMethod) {
    actions.push(createSetMethodInfoMethodAction(paymentMethod))
    const action = createSetMethodInfoNameAction(paymentMethod)
    if (action) actions.push(action)
  }

  const updatePaymentAction = getPaymentKeyUpdateAction(
    paymentObject.key,
    request,
    response,
  )
  if (updatePaymentAction) actions.push(updatePaymentAction)

  const addTransactionAction = createAddTransactionActionByResponse(
    paymentObject.amountPlanned.centAmount,
    paymentObject.amountPlanned.currencyCode,
    response,
  )

  if (addTransactionAction) actions.push(addTransactionAction)

  return {
    actions,
  }
}

export default { execute }
