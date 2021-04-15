const { serializeError } = require('serialize-error')
const httpUtils = require('../../utils')
const auth = require('../../validator/authentication')
const paymentHandler = require('../../paymentHandler/payment-handler')

const logger = httpUtils.getLogger()

async function processRequest(request, response) {
  if (request.method !== 'POST')
    // API extensions always calls this endpoint with POST, so if we got GET, we don't process further
    // https://docs.commercetools.com/http-api-projects-api-extensions#input
    return httpUtils.sendResponse({
      response,
      statusCode: 400,
      data: {
        errors: [
          {
            code: 'InvalidInput',
            message: 'Invalid HTTP method.',
          },
        ],
      },
    })

  let paymentObject = {}
  try {
    const authToken = auth.getAuthorizationRequestHeader(request)
    paymentObject = await _getPaymentObject(request)
    const paymentResult = await paymentHandler.handlePayment(
      paymentObject,
      authToken
    )
    const result = {
      response,
      statusCode: paymentResult.success ? 200 : 400,
      data: null,
    }

    if (paymentResult.success && paymentResult.actions) {
      result.data = { actions: paymentResult.actions }
    }
    if (!paymentResult.success && paymentResult.errors) {
      result.data = { errors: paymentResult.errors }
    }
    return httpUtils.sendResponse(result)
  } catch (err) {
    return httpUtils.sendResponse({
      response,
      statusCode: 400,
      data: httpUtils.handleUnexpectedPaymentError(paymentObject, err),
    })
  }
}

async function _getPaymentObject(request) {
  let body = {}
  try {
    body = await httpUtils.collectRequestData(request)
    const requestBody = JSON.parse(body)
    return requestBody.resource.obj
  } catch (err) {
    const errorStackTrace =
      `Error during parsing CTP request: '${body}'. Ending the process. ` +
      `Error: ${JSON.stringify(serializeError(err))}`
    logger.error(errorStackTrace)
    throw err
  }
}

module.exports = { processRequest }
