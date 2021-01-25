const { makePayment } = require('../service/web-component-service')
const pU = require('./payment-utils')
const c = require('../config/constants')

async function execute(paymentObject) {
  const makePaymentRequestObj = JSON.parse(
    paymentObject.custom.fields.makePaymentRequest
  )
  const { request, response } = await makePayment(makePaymentRequestObj)
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

module.exports = { execute }
