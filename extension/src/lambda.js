const utils = require('./utils')
const paymentHandler = require('../src/paymentHandler/payment-handler')

const logger = utils.getLogger()

exports.handler = async function (event) {
  try {
    const paymentResult = await paymentHandler.handlePayment(event.resource.obj)

    return {
      responseType: paymentResult.success ? 'UpdateRequest' : 'FailedValidation',
      // Null check around paymentResult.data,
      // which can be null if paymentHandler short circuits when not an adyen payment
      errors: paymentResult.data ? paymentResult.data.errors : undefined,
      actions: paymentResult.data ? paymentResult.data.actions : undefined
    }
  } catch (e) {
    logger.error(e, `Unexpected error when processing event ${JSON.stringify(event)}`)
    throw e
  }
}
