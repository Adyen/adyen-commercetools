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
    const noPaymentError = new Error('No payment object is found.')
    logger.error(
      {
        err: noPaymentError,
      },
      'Unexpected error when processing event'
    )
    throw noPaymentError
  }
  const paymentResult = await paymentHandler.handlePayment(obj)
  if (paymentResult.success) {
    response.status(200).send({
      data: paymentResult.data,
    })
  } else {
    response.status(400).send({
      data: paymentResult.data,
    })
  }
}
