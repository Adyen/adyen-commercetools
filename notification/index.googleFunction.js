/**
 * Main javascript file for GCP serverless function.
 * For more details, please refers to : https://cloud.google.com/functions
 *
 * Entry point: notificationTrigger
 */

const ctp = require('./src/utils/ctp')
const handler = require('./src/handler/notification/notification.handler')
const config = require('./src/config/config')()
const logger = require('./src/utils/logger').getLogger()
const { getNotificationForTracking } = require('./src/utils/commons')

const ctpClient = ctp.get(config)

exports.notificationTrigger = async (request, response) => {
  const { notificationItems } = request.body
  try {
    if (!notificationItems) {
      throw new Error('No notification received.')
    }
    await handler.processNotifications(notificationItems, ctpClient)
    response.status(200).send({
      notificationResponse: '[accepted]',
    })
  } catch (e) {
    logger.error(
      {
        notification: getNotificationForTracking(notificationItems),
        err: e,
      },
      'Unexpected error when processing event'
    )
    response.status(500).send('Unexpected error when processing event')
  }
}
