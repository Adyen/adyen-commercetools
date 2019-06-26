const utils = require('./utils')
const paymentHandler = require('../src/paymentHandler/payment-handler')

const logger = utils.getLogger()

exports.handler = async function (event) {
  try {
    const paymentResult = await paymentHandler.handlePayment(event.resource.obj)

    return {
      responseType: paymentResult.success ? 'UpdateRequest' : 'FailedValidation',
      errors: paymentResult.data.errors,
      actions: paymentResult.data.actions
    }
  } catch (e) {
    logger.error(e, `Unexpected error when processing event ${JSON.stringify(event)}`)
    throw e
  }
}
