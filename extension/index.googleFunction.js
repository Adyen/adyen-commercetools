const { serializeError } = require('serialize-error')
const paymentHandler = require('./src/paymentHandler/payment-handler')
const utils = require('./src/utils')
const auth = require('./src/validator/authentication')

const logger = utils.getLogger()

exports.extensionTrigger = async (request, response) => {
  const obj = request?.body?.resource?.obj
  try {
    if (!obj) {
      return utils.sendGoogleFunctionResponse({
        response,
        statusCode: 400,
        body: {
          errors: [
            {
              code: 'BadRequest',
              message: 'Invalid body payload.',
            },
          ],
        },
      })
    }
    const authToken = auth.getAuthorizationRequestHeader(request)
    const paymentResult = await paymentHandler.handlePayment(obj, authToken)
    if (paymentResult.success) {
      return utils.sendGoogleFunctionResponse({
        response,
        statusCode: 200,
        body: {
          actions: paymentResult?.actions,
        },
      })
    }
    return utils.sendGoogleFunctionResponse({
      response,
      statusCode: 400,
      body: {
        errors: paymentResult?.errors,
      },
    })
  } catch (err) {
    const errorMessage = `Unexpected error (Payment ID: ${obj?.id}): ${err.message}. `
    const errorStackTrace = `Unexpected error (Payment ID: ${
      obj?.id
    }): ${JSON.stringify(serializeError(err))}`
    logger.error(errorStackTrace)

    return utils.sendGoogleFunctionResponse({
      response,
      statusCode: 400,
      body: {
        errors: [
          {
            code: 'BadRequest',
            message: errorMessage,
          },
        ],
      },
    })
  }
}
