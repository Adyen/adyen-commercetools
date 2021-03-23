const { serializeError } = require('serialize-error')
const paymentHandler = require('./src/paymentHandler/payment-handler')
const utils = require('./src/utils')
const auth = require('./src/validator/authentication')

const logger = utils.getLogger()

exports.extensionTrigger = async (request, response) => {
  try {
    const authToken = auth.getAuthorizationRequestHeader(request)
    if (!request?.body?.resource) {
      response.status(400).send({
        errors: [
          {
            code: 'BadRequest',
            message: 'Invalid body payload.',
          },
        ],
      })
    }

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
    const errorMessage = `Unexpected error: ${err.message}`
    logger.error(errorMessage)

    response.status(400).send({
      errors: [
        {
          code: 'InvalidOperation',
          message: errorMessage,
        },
      ],
    })
  }
}
