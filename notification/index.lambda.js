const handler = require('./src/handler/notification/notification.handler')
const logger = require('./src/utils/logger').getLogger()
const { getNotificationForTracking } = require('./src/utils/commons')
const { getCtpProjectConfig, getAdyenConfig } = require('./src/utils/parser')

exports.handler = async (event) => {
  // Reason for this check: event.body is a string of payload when AWS API Gateway is used.
  const body = event.body ? JSON.parse(event.body) : event
  const { notificationItems } = body
  if (!notificationItems) {
    const error = new Error('No notification received.')
    logger.error(
      {
        notification: undefined,
        err: error,
      },
      'Unexpected error when processing event'
    )
    throw error
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
      throw err
    }
  }

  return {
    notificationResponse: '[accepted]',
  }
}
