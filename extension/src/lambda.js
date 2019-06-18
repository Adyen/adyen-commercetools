const utils = require('./utils')
const paymentHandler = require('../src/paymentHandler/payment-handler')
const setup = require('./config/init/ensure-resources')

const logger = utils.getLogger()
let init = false

exports.handler = async function(event) {
  try {

    init = init || await setup.ensureCustomTypes()
    
    const paymentResult = await paymentHandler.handlePayment(event.resource.obj)

    return {
      responseType: paymentResult.success ? `UpdateRequest` : `FailedValidation`,
      errors: paymentResult.data.errors,
      actions: paymentResult.data.actions
    }
  }
  catch (e) {
    logger.error(e, `Unexpected error when processing event ${JSON.stringify(event)}`)
    throw e;
  }
}