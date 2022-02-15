import pU from './payment-utils'
import c from '../config/constants'
import componentService from '../service/web-component-service'

const { makePayment } = componentService

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
    pU.createAddInterfaceInteractionAction({
      request,
      response,
      type: c.CTP_INTERACTION_TYPE_MAKE_PAYMENT,
    }),
    pU.createSetCustomFieldAction(
      c.CTP_CUSTOM_FIELD_MAKE_PAYMENT_RESPONSE,
      response
    ),
  ]

  const paymentMethod = request.paymentMethod?.type
  if (paymentMethod) {
    actions.push(pU.createSetMethodInfoMethodAction(paymentMethod))
    const action = pU.createSetMethodInfoNameAction(paymentMethod)
    if (action) actions.push(action)
  }

  const paymentKey = paymentObject.key
  // ensure the key is a string, otherwise the error with "code": "InvalidJsonInput" will return by commercetools API.
  const reference = request.reference.toString()
  // ensure the key and new reference is different, otherwise the error with
  // "code": "InvalidOperation", "message": "'key' has no changes." will return by commercetools API.
  if (reference !== paymentKey)
    actions.push({
      action: 'setKey',
      key: reference,
    })

  const addTransactionAction = pU.createAddTransactionActionByResponse(
    paymentObject.amountPlanned.centAmount,
    paymentObject.amountPlanned.currencyCode,
    response
  )

  if (addTransactionAction) actions.push(addTransactionAction)

  return {
    actions,
  }
}

export default execute
