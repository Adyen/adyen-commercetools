const handler = require('./src/handler/notification/notification.handler')
const logger = require('./src/utils/logger').getLogger()
const { getNotificationForTracking } = require('./src/utils/commons')
const { getErrorCause, isRecoverableError } = require('./src/utils/error-utils')

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
    const cause = getErrorCause(err)
    logger.error(
      { notification: getNotificationForTracking(notificationItems), cause },
      'Unexpected exception occurred.'
    )
    if (isRecoverableError(err)) {
      return response.status(500).send(cause.message)
    }
  }

  return response.status(200).send({
    notificationResponse: '[accepted]',
  })
}
