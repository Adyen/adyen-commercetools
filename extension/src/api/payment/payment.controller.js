const { serializeError } = require('serialize-error')
const httpUtils = require('../../utils')
const paymentHandler = require('../../paymentHandler/payment-handler')

async function processRequest(request, response) {
  if (request.method !== 'POST')
    // API extensions always calls this endpoint with POST, so if we got GET, we don't process further
    // https://docs.commercetools.com/http-api-projects-api-extensions#input
    return httpUtils.sendResponse({ response })

  const authToken = httpUtils.getAuthorizationHeader(request)

  const paymentObject = await _getPaymentObject(request)
  const paymentResult = await paymentHandler.handlePayment(
    paymentObject,
    authToken
  )

  return httpUtils.sendResponse({
    response,
    statusCode: paymentResult.success ? 200 : 400,
    data: paymentResult.data,
  })
}

async function _getPaymentObject(request) {
  const body = await httpUtils.collectRequestData(request)
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
