import sessionRequestHandler from './sessions-request.handler.js'
import lineItemsUtils from './line-items-utils.js'

async function execute(paymentObject) {
  const createSessionRequestObj = JSON.parse(
    paymentObject.custom.fields.createSessionRequest,
  )
  const commercetoolsProjectKey =
    paymentObject.custom.fields.commercetoolsProjectKey
  if (!createSessionRequestObj.lineItems) {
    const ctpCart = await lineItemsUtils.fetchMatchingCart(
      paymentObject,
      commercetoolsProjectKey,
    )
    if (ctpCart) {
      createSessionRequestObj.lineItems = lineItemsUtils.createLineItems(
        paymentObject,
        ctpCart,
      )
      paymentObject.custom.fields.createSessionRequest = JSON.stringify(
        createSessionRequestObj,
      )
    }
  }

  return sessionRequestHandler.execute(paymentObject)
}

export default { execute }
