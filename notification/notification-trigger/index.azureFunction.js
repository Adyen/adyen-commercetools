import notificationHandler from '../src/handler/notification/notification.handler.js'
import { getLogger } from '../src/utils/logger.js'
import utils from '../src/utils/commons.js'
import {
  getErrorCause,
  isRecoverableError,
  isUnauthorizedError,
} from '../src/utils/error-utils.js'
import { getCtpProjectConfig, getAdyenConfig } from '../src/utils/parser.js'

const logger = getLogger()

function handleSuccessResponse(context) {
  context.res = {
    status: 200,
    body: {
      notificationResponse: '[accepted]',
    },
  }
}

function handleErrorResponse(context, status, errorMessage) {
  context.res = {
    status,
    body: {
      error: errorMessage,
    },
  }
}

export const azureNotificationTrigger = async function (context, req) {
  const { notificationItems } = req?.body || {}
  if (!notificationItems) {
    handleErrorResponse(context, 400, 'No notification received.')
    return
  }

  try {
    for (const notification of notificationItems) {
      const ctpProjectConfig = getCtpProjectConfig(notification, req.url)
      const adyenConfig = getAdyenConfig(notification)

      await notificationHandler.processNotification({
        notification,
        enableHmacSignature: adyenConfig.enableHmacSignature,
        enableBasicAuth: adyenConfig.enableBasicAuth,
        authorizationHeader: req.headers?.authorization,
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
      handleErrorResponse(context, 401, cause.message)
      return
    }
    if (isRecoverableError(err)) {
      handleErrorResponse(context, 500, cause.message)
      return
    }
  }

  handleSuccessResponse(context)
}
