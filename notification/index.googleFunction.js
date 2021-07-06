const handler = require('./src/handler/notification/notification.handler')
const logger = require('./src/utils/logger').getLogger()
const { getNotificationForTracking, isRecoverableError } = require('./src/utils/commons')
const { getCtpProjectConfig, getAdyenConfig } = require('./src/utils/parser')

exports.notificationTrigger = async (request, response) => {
  const { notificationItems } = request.body
  if (!notificationItems) {
    return response.status(400).send('No notification received.')
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
    if (isRecoverableError(err)) {
      return response.status(500).send(err.message)
    }
  }

  return response.status(200).send({
    notificationResponse: '[accepted]',
  })
}
