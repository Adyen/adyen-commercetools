const {utils} = require('commercetools-adyen-integration-commons')
const paymentHandler = require("./paymentHandler/payment-handler")

const logger = utils.getLogger()

exports.handler = async function (event) {
  try {
    const paymentResult = await paymentHandler.handlePayment(event.resource.obj)

    return {
      responseType: paymentResult.success
        ? 'UpdateRequest'
        : 'FailedValidation',
      // paymentResult.data can be null when paymentHandler short-circuits on non-Adyen payment
      errors: paymentResult.data ? paymentResult.data.errors : undefined,
      actions: paymentResult.data ? paymentResult.data.actions : [],
    }
  } catch (e) {
    logger.error(
      e,
      `Unexpected error when processing event ${JSON.stringify(event)}`
    )
    throw e
  }
}
