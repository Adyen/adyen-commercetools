import notificationHandler from './src/handler/notification/notification.handler.js'
import { getLogger } from './src/utils/logger.js'
import utils from './src/utils/commons.js'
import { getErrorCause, isRecoverableError } from './src/utils/error-utils.js'
import { getCtpProjectConfig, getAdyenConfig } from './src/utils/parser.js'

const logger = getLogger()

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
      'Unexpected error when processing event',
    )
    throw error
  }
  try {
    for (const notification of notificationItems) {
      const ctpProjectConfig = getCtpProjectConfig(
        notification,
        event.rawPath || event.path,
      )
      const adyenConfig = getAdyenConfig(notification)

      await notificationHandler.processNotification(
        notification,
        adyenConfig.enableHmacSignature,
        ctpProjectConfig,
      )
    }
  } catch (err) {
    const cause = getErrorCause(err)
    logger.error(
      {
        notification: utils.getNotificationForTracking(notificationItems),
        cause,
      },
      'Unexpected exception occurred.',
    )
    if (isRecoverableError(err)) {
      throw err
    }
  }

  return {
    notificationResponse: '[accepted]',
  }
}
