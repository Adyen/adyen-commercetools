import { serializeError } from 'serialize-error'
import httpUtils from '../../utils.js'
import { getAuthorizationRequestHeader } from '../../validator/authentication.js'
import paymentHandler from '../../paymentHandler/payment-handler.js'

async function processRequest(request, response, logger) {
  if (request.method !== 'POST') {
    // API extensions always calls this endpoint with POST, so if we got GET, we don't process further
    // https://docs.commercetools.com/api/projects/api-extensions#input
    logger.debug(
      `Received non-POST request: ${request.method}. The request will not be processed...`,
    )
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
  }

  let paymentObject = {}
  try {
    const authToken = getAuthorizationRequestHeader(request)
    paymentObject = await _getPaymentObject(request, logger)
    const paymentLogger = logger.child({ paymentId: paymentObject.id })
    paymentLogger.debug(
      'Received payment object',
      JSON.stringify(paymentObject),
    )

    paymentLogger.info({ paymentId: paymentObject.id }, 'Handling payment...')
    const paymentResult = await paymentHandler.handlePayment(
      paymentObject,
      authToken,
    )
    const statusCode = paymentResult.actions ? 200 : 400
    paymentLogger.info(
      { statusCode, errors: paymentResult.errors },
      'Payment handled',
    )

    const result = {
      response,
      statusCode,
      data: paymentResult.actions
        ? { actions: paymentResult.actions }
        : { errors: paymentResult.errors },
    }

    paymentLogger.debug('Data to be returned', JSON.stringify(result.data))

    return httpUtils.sendResponse(result)
  } catch (err) {
    logger.error(err, 'Error while handling payment')
    return httpUtils.sendResponse({
      response,
      statusCode: 400,
      data: httpUtils.handleUnexpectedPaymentError(paymentObject, err),
    })
  }
}

async function _getPaymentObject(request, logger) {
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

export default { processRequest }
