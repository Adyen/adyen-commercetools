const VError = require('verror')
const handler = require('./src/handler/notification/notification.handler')
const logger = require('./src/utils/logger').getLogger()
const {
  getNotificationForTracking,
  isRecoverableError,
} = require('./src/utils/commons')
const { getCtpProjectConfig, getAdyenConfig } = require('./src/utils/parser')

exports.handler = async (event) => {
  // Reason for this check: if AWS API Gateway is used then event.body is provided as a string payload.
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
    let cause = err
    if (err instanceof VError) cause = err.cause()
    logger.error(
      { notification: getNotificationForTracking(notificationItems), cause },
      'Unexpected exception occurred.'
    )
    if (isRecoverableError(err)) {
      throw err
    }
  }

  return {
    notificationResponse: '[accepted]',
  }
}
