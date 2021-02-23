const { serializeError } = require('serialize-error')
const paymentHandler = require('./src/paymentHandler/payment-handler')
const utils = require('./src/utils')

const logger = utils.getLogger()

exports.extensionTrigger = async (request, response) => {
  try {
    const authToken = utils.getAuthorizationHeader(request)
    const { obj } = request.body.resource
    const paymentResult = await paymentHandler.handlePayment(obj, authToken)
    if (paymentResult.success) {
      response.status(200).send({
        actions: paymentResult.data ? paymentResult.data.actions : [],
      })
    } else {
      response.status(400).send({
        errors: paymentResult.data ? paymentResult.data.errors : undefined,
      })
    }
  } catch (err) {
    const errorMessage = `Unexpected error: ${JSON.stringify(
      serializeError(err)
    )}`
    logger.error(errorMessage)

    response.status(500).send({
      errors: [
        {
          code: 'InvalidOperation',
          message: errorMessage,
        },
      ],
    })
  }
}
