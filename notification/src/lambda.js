const handler = require('./handler/notification/notification.handler')
const logger = require('./utils/logger').getLogger()
const { getNotificationForTracking } = require('./utils/commons')
const { getCtpProjectConfig, getAdyenConfig } = require('./utils/parser')

exports.handler = async (event) => {
  const { notificationItems } = event
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
