const serializeError = require('serialize-error')
const utils = require('./utils')
const paymentHandler = require('../src/paymentHandler/payment-handler')

const { ensureResources } = require('./config/init/ensure-resources')

const logger = utils.getLogger()
const init = false;

exports.handler =  async function(event) {
  try {

    init = init || await ensureResources();

    const paymentObject = _getPaymentObject(event);
    const paymentResult = await paymentHandler.handlePayment(paymentObject)

    return paymentResult.data
  }
  catch (e) {
    logger.error(e, `Unexpected error when processing event ${JSON.stringify(event)}`)
  }
}

function _getPaymentObject(event) {  
  try {
    const requestBody = JSON.parse(event)
    return requestBody.resource.obj
  } catch (err) {
    throw new Error(`Error during parsing CTP request: '${event}'. Ending the process. `
      + `Error: ${JSON.stringify(serializeError(err))}`)
  }
}