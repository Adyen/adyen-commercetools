/**
 * If you are deploying extension module as a serverless function,
 * this will be the main javascript file.
 *
 * This function has tested as Google Cloud Function
 *
 * Entry point: extensionTrigger
 */

const paymentController = require('./src/api/payment/payment.controller')
const httpUtils = require('./src/utils')

// Google Cloud Function works with express framework. Therefore, we can simply extract
// out the HTTP request body as follows
httpUtils.collectRequestData = (request) => {
  return JSON.stringify(request.body)
}
exports.httpUtils = httpUtils

exports.extensionTrigger = (async (request, response) => {
  await paymentController.processRequest(request, response)
})
