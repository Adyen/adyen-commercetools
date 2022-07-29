import notificationHandler from './src/handler/notification/notification.handler.js'
import { getLogger } from './src/utils/logger.js'
import utils from './src/utils/commons.js'
import { getErrorCause, isRecoverableError } from './src/utils/error-utils.js'
import { getCtpProjectConfig, getAdyenConfig } from './src/utils/parser.js'

const logger = getLogger()

export const azureExtensionTrigger = async function (context, event) {
  const { notificationItems } = event.body
  if (!notificationItems) {
    context.res = {
      body: {
        errors: [
          {
            status: 400,
            message: 'No notification received.',
          },
        ],
      },
    }
    return
  }

  try {
    for (const notification of notificationItems) {
      const ctpProjectConfig = getCtpProjectConfig(notification, event.rawPath)
      const adyenConfig = getAdyenConfig(notification)

      await notificationHandler.processNotification(
        notification,
        adyenConfig.enableHmacSignature,
        ctpProjectConfig
      )
    }
  } catch (err) {
    const cause = getErrorCause(err)
    logger.error(
      {
        notification: utils.getNotificationForTracking(notificationItems),
        cause,
      },
      'Unexpected exception occurred.'
    )

    if (isRecoverableError(err)) {
      context.res = {
        body: {
          errors: [
            {
              status: 500,
              message: cause.message,
            },
          ],
        },
      }
    }
    return
  }

  context.res = {
    body: {
      notificationResponse: '[accepted]',
    },
  }
}
