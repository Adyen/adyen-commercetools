/**
 * Main javascript file for GCP serverless function.
 * For more details, please refers to : https://cloud.google.com/functions
 *
 * Entry point: notificationTrigger
 */

const handler = require('./src/handler/notification/notification.handler')
const logger = require('./src/utils/logger').getLogger()
const { getNotificationForTracking } = require('./src/utils/commons')
const { getCtpProjectConfig, getAdyenConfig } = require('./src/utils/parser')

exports.notificationTrigger = async (request, response) => {
  const { notificationItems } = request.body
  if (!notificationItems) {
    response.status(500).send('No notification received.')
  }
  try {
    for (const notification of notificationItems) {
      const ctpProjectConfig = getCtpProjectConfig(notification)
      const adyenConfig = getAdyenConfig(notification)

      await handler.processNotification(
        notification,
        adyenConfig.enableHmacSignature,
        ctpProjectConfig
      )
    }
  } catch (err) {
    logger.error(
      { notification: getNotificationForTracking(notificationItems), err },
      'Unexpected exception occurred.'
    )
    if (err.isRecoverable) {
      return response.status(500).send(err.message)
    }
  }

  response.status(200).send({
    notificationResponse: '[accepted]',
  })
}
