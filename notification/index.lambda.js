import handler from './src/handler/notification/notification.handler'
import logg from './src/utils/logger'
import { getNotificationForTracking } from './src/utils/commons'
import { getErrorCause, isRecoverableError } from './src/utils/error-utils'
import { getCtpProjectConfig, getAdyenConfig } from './src/utils/parser'

const logger = logg.getLogger()

export const handler = async (event) => {
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
