import url from 'url'
import handler from './src/handler/notification/notification.handler.js'
import { getLogger } from './src/utils/logger.js'
import utils from './src/utils/commons.js'
import {
  getErrorCause,
  isRecoverableError,
  isUnauthorizedError,
} from './src/utils/error-utils.js'
import { getCtpProjectConfig, getAdyenConfig } from './src/utils/parser.js'

const logger = getLogger()

export const notificationTrigger = async (request, response) => {
  const { notificationItems } = request.body
  if (!notificationItems) {
    return response.status(400).send('No notification received.')
  }
  try {
    for (const notification of notificationItems) {
      const parts = url.parse(request.url)
      const ctpProjectConfig = getCtpProjectConfig(notification, parts.path)
      const adyenConfig = getAdyenConfig(notification)

      await handler.processNotification({
        notification,
        enableHmacSignature: adyenConfig.enableHmacSignature,
        enableBasicAuth: adyenConfig.enableBasicAuth,
        authorizationHeader: request.headers?.authorization,
        ctpProjectConfig,
        logger,
      })
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
    if (isUnauthorizedError(err)) {
      return response
        .status(401)
        .set('WWW-Authenticate', 'Basic realm="adyen-notification"')
        .send(cause.message)
    }
    if (isRecoverableError(err)) {
      return response.status(500).send(cause.message)
    }
  }

  return response.status(200).send({
    notificationResponse: '[accepted]',
  })
}
