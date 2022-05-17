const util = require('util')
const handler = require('./src/handler/notification/notification.handler')
const logger = require('./src/utils/logger').getLogger()
const { getNotificationForTracking } = require('./src/utils/commons')
const { getErrorCause, isRecoverableError } = require('./src/utils/error-utils')
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
      console.log('event is ' + util.inspect(event, { depth: null }))
      console.log('event path is ' + JSON.stringify(event.rawPath))
      const ctpProjectConfig = getCtpProjectConfig(notification, event.rawPath)
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
      throw err
    }
  }

  return {
    notificationResponse: '[accepted]',
  }
}
