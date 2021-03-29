const { serializeError } = require('serialize-error')
const paymentHandler = require('./src/paymentHandler/payment-handler')
const utils = require('./src/utils')
const auth = require('./src/validator/authentication')

const logger = utils.getLogger()

exports.extensionTrigger = async (request, response) => {
  const obj = request?.body?.resource?.obj
  try {
    if (!obj) {
      return response.status(400).send({
        errors: [
          {
            code: 'InvalidInput',
            message: 'Invalid body payload.',
          },
        ],
      })
    }
    const authToken = auth.getAuthorizationRequestHeader(request)
    const paymentResult = await paymentHandler.handlePayment(obj, authToken)
    if (paymentResult.success) {
      return response.status(200).send({
        actions: paymentResult.data ? paymentResult.data.actions : [],
      })
    }
    return response.status(400).send({
      errors: paymentResult.data ? paymentResult.data.errors : undefined,
    })
  } catch (err) {
    const errorMessage = `Unexpected error (Payment ID: ${obj?.id}): ${err.message}. `
    const errorStackTrace = `Unexpected error (Payment ID: ${
      obj?.id
    }): ${JSON.stringify(serializeError(err))}`
    logger.error(errorStackTrace)

    return response.status(400).send({
      errors: [
        {
          code: 'General',
          message: errorMessage,
        },
      ],
    })
  }
}
