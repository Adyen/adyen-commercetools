import makePaymentHandler from './make-payment.handler.js'
import lineItemsUtils from './line-items-utils.js'

async function execute(paymentObject) {
  const makePaymentRequestObj = JSON.parse(
    paymentObject.custom.fields.makePaymentRequest,
  )
  const commercetoolsProjectKey =
    paymentObject.custom.fields.commercetoolsProjectKey
  if (!makePaymentRequestObj.lineItems) {
    const ctpCart = await lineItemsUtils.fetchMatchingCart(
      paymentObject,
      commercetoolsProjectKey,
    )
    if (ctpCart) {
      makePaymentRequestObj.lineItems = lineItemsUtils.createLineItems(
        paymentObject,
        ctpCart,
      )
      paymentObject.custom.fields.makePaymentRequest = JSON.stringify(
        makePaymentRequestObj,
      )
    }
  }

  return makePaymentHandler.execute(paymentObject)
}
export default { execute }
