import handler from './src/handler/notification/notification.handler'
import logg from './src/utils/logger'
import { getNotificationForTracking } from './src/utils/commons'
import { getErrorCause, isRecoverableError } from './src/utils/error-utils'

import { getCtpProjectConfig, getAdyenConfig } from './src/utils/parser'

const logger = logg.getLogger()

export const notificationTrigger = async (request, response) => {
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
