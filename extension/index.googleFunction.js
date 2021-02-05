/**
 * Main javascript file for GCP serverless function.
 * For more details, please refers to : https://cloud.google.com/functions
 *
 * Entry point: extensionTrigger
 */
const paymentHandler = require('./src/paymentHandler/payment-handler')
const utils = require('./src/utils')

const logger = utils.getLogger()

exports.extensionTrigger = async (request, response) => {
  const { obj } = request.body.resource

  if (!obj) {
    const errorMessage = 'No payment object is found.'
    const noPaymentErrorJson = {
      errors: [
        {
          code: 'InvalidInput',
          message: errorMessage,
        },
      ],
    }
    logger.error(errorMessage)
    response.status(400).send(noPaymentErrorJson)
  } else {
    const paymentResult = await paymentHandler.handlePayment(obj)
    if (paymentResult.success) {
      response.status(200).send(paymentResult.data)
    } else {
      response.status(400).send(paymentResult.data)
    }
  }
}
