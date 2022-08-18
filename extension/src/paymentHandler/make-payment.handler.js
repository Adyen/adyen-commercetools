import {
  createAddInterfaceInteractionAction,
  createSetCustomFieldAction,
  createSetMethodInfoMethodAction,
  createSetMethodInfoNameAction,
  createAddTransactionActionByResponse,
} from './payment-utils.js'
import c from '../config/constants.js'
import { makePayment } from '../service/web-component-service.js'

async function execute(paymentObject) {
  const makePaymentRequestObj = JSON.parse(
    paymentObject.custom.fields.makePaymentRequest
  )
  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const commercetoolsProjectKey =
    paymentObject.custom.fields.commercetoolsProjectKey
  const { request, response } = await makePayment(
    adyenMerchantAccount,
    commercetoolsProjectKey,
    makePaymentRequestObj
  )
  const actions = [
    createAddInterfaceInteractionAction({
      request,
      response,
      type: c.CTP_INTERACTION_TYPE_MAKE_PAYMENT,
    }),
    createSetCustomFieldAction(
      c.CTP_CUSTOM_FIELD_MAKE_PAYMENT_RESPONSE,
      response
    ),
  ]

  const requestBodyJson = JSON.parse(request.body)
  const paymentMethod = requestBodyJson.paymentMethod?.type
  if (paymentMethod) {
    actions.push(createSetMethodInfoMethodAction(paymentMethod))
    const action = createSetMethodInfoNameAction(paymentMethod)
    if (action) actions.push(action)
  }

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

  const addTransactionAction = createAddTransactionActionByResponse(
    paymentObject.amountPlanned.centAmount,
    paymentObject.amountPlanned.currencyCode,
    response
  )

  if (addTransactionAction) actions.push(addTransactionAction)

  return {
    actions,
  }
}

export default { execute }
