const { serializeError } = require('serialize-error')
const {utils} = require('commercetools-adyen-integration-commons')
const paymentHandler = require('../../paymentHandler/payment-handler')

async function processRequest(request, response) {
  if (request.method !== 'POST')
    // API extensions always calls this endpoint with POST, so if we got GET, we don't process further
    // https://docs.commercetools.com/http-api-projects-api-extensions#input
    return utils.sendResponse({ response })

  const paymentObject = await _getPaymentObject(request)
  const paymentResult = await paymentHandler.handlePayment(paymentObject)

  return utils.sendResponse({
    response,
    statusCode: paymentResult.success ? 200 : 400,
    data: paymentResult.data,
  })
}

async function _getPaymentObject(request) {
  const body = await utils.collectRequestData(request)
  try {
    const requestBody = JSON.parse(body)
    return requestBody.resource.obj
  } catch (err) {
    throw new Error(
      `Error during parsing CTP request: '${body}'. Ending the process. ` +
        `Error: ${JSON.stringify(serializeError(err))}`
    )
  }
}

module.exports = { processRequest }
