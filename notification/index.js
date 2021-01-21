/**
 * If you are deploying extension module as a serverless function,
 * this will be the main javascript file.
 *
 * This function has tested as Google Cloud Function
 *
 * Entry point: notificationTrigger
 */

const notificationController = require('./src/api/notification/notification.controller')
const httpUtils = require('./src/utils/commons')

httpUtils.collectRequestData = (request) => JSON.stringify(request.body)
exports.httpUtils = httpUtils

exports.notificationTrigger = async (request, response) => {
  await notificationController.handleNotification(request, response)
}
