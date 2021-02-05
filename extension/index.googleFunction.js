/**
 * Main javascript file for GCP serverless function.
 * For more details, please refers to : https://cloud.google.com/functions
 *
 * Entry point: extensionTrigger
 */
const { serializeError } = require('serialize-error')
const paymentHandler = require('./src/paymentHandler/payment-handler')
const utils = require('./src/utils')

const logger = utils.getLogger()

exports.extensionTrigger = async (request, response) => {
  try {
    const { obj } = request.body.resource
    const paymentResult = await paymentHandler.handlePayment(obj)
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

    response.status(400).send('Unexpected error happened, check the logs.')
  }
}
