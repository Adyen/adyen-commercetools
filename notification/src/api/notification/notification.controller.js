import _ from 'lodash'
import url from 'url'
import utils from '../../utils/commons.js'
import { isRecoverableError, getErrorCause } from '../../utils/error-utils.js'
import notificationHandler from '../../handler/notification/notification.handler.js'
import { getCtpProjectConfig, getAdyenConfig } from '../../utils/parser.js'
import { getLogger } from '../../utils/logger.js'

const logger = getLogger()

async function handleNotification(request, response) {
  if (request.method !== 'POST') {
    logger.debug(
      `Received non-POST request: ${request.method}. The request will not be processed...`,
    )
    return utils.sendResponse(response)
  }
  const body = await utils.collectRequestData(request)
  try {
    const notifications = _.get(JSON.parse(body), 'notificationItems', [])
    for (const notification of notifications) {
      logger.debug('Received notification', JSON.stringify(notification))
      const parts = url.parse(request.url)
      const ctpProjectConfig = getCtpProjectConfig(notification, parts.path)
      const adyenConfig = getAdyenConfig(notification)

      await notificationHandler.processNotification(
        notification,
        adyenConfig.enableHmacSignature,
        ctpProjectConfig,
      )
    }
    return sendAcceptedResponse(response)
  } catch (err) {
    const notification = _.get(JSON.parse(body), 'notificationItems', [])
    const cause = getErrorCause(err)
    logger.error(
      {
        notification: utils.getNotificationForTracking(notification),
        cause,
      },
      'Unexpected exception occurred.',
    )
    if (isRecoverableError(err)) {
      return utils.sendResponse(response, 500)
    }
    return sendAcceptedResponse(response)
  }
}

function sendAcceptedResponse(response) {
  // From the Adyen docs:
  // To ensure that your server is properly accepting notifications,
  // we require you to acknowledge every notification of any type with an [accepted] response.

  return utils.sendResponse(
    response,
    200,
    { 'Content-Type': 'application/json' },
    JSON.stringify({ notificationResponse: '[accepted]' }),
  )
}

export { handleNotification }
