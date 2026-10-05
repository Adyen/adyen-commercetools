import notificationHandler from './src/handler/notification/notification.handler.js'
import { getLogger } from './src/utils/logger.js'
import utils from './src/utils/commons.js'
import {
  getErrorCause,
  isRecoverableError,
  isUnauthorizedError,
} from './src/utils/error-utils.js'
import { getCtpProjectConfig, getAdyenConfig } from './src/utils/parser.js'

const logger = getLogger()

function getAuthorizationHeader(event) {
  // AWS HTTP API events usually lowercase header names, but direct invocations
  // or REST API events may preserve the original casing.
  const headers = event?.headers
  if (!headers) return undefined
  const headerName = Object.keys(headers).find(
    (name) => name.toLowerCase() === 'authorization',
  )
  return headerName ? headers[headerName] : undefined
}

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

      await notificationHandler.processNotification({
        notification,
        enableHmacSignature: adyenConfig.enableHmacSignature,
        enableBasicAuth: adyenConfig.enableBasicAuth,
        authorizationHeader: getAuthorizationHeader(event),
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
      return {
        statusCode: 401,
        isBase64Encoded: false,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Basic realm="adyen-notification"',
        },
        body: JSON.stringify({ error: cause.message }),
      }
    }
    if (isRecoverableError(err)) {
      throw err
    }
  }

  const responseBody = {
    notificationResponse: '[accepted]',
  }

  return {
    statusCode: 200,
    isBase64Encoded: false,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(responseBody),
  }
}
