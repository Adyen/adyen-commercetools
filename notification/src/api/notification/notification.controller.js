import _ from 'lodash'
import httpUtils from '../../utils/commons'
import { isRecoverableError, getErrorCause } from '../../utils/error-utils'

import { processNotification } from '../../handler/notification/notification.handler'
import { getCtpProjectConfig, getAdyenConfig } from '../../utils/parser'

import logg from '../../utils/logger'

const logger = logg.getLogger()

async function handleNotification(request, response) {
  if (request.method !== 'POST') {
    logger.debug(
      `Received non-POST request: ${request.method}. The request will not be processed...`
    )
    return httpUtils.sendResponse(response)
  }
  const body = await httpUtils.collectRequestData(request)
  try {
    const notifications = _.get(JSON.parse(body), 'notificationItems', [])
    for (const notification of notifications) {
      logger.debug('Received notification', JSON.stringify(notification))
      const ctpProjectConfig = getCtpProjectConfig(notification)
      const adyenConfig = getAdyenConfig(notification)

      await processNotification(
        notification,
        adyenConfig.enableHmacSignature,
        ctpProjectConfig
      )
    }
    return sendAcceptedResponse(response)
  } catch (err) {
    const notification = _.get(JSON.parse(body), 'notificationItems', [])
    const cause = getErrorCause(err)
    logger.error(
      {
        notification: httpUtils.getNotificationForTracking(notification),
        cause,
      },
      'Unexpected exception occurred.'
    )
    if (isRecoverableError(err)) {
      return httpUtils.sendResponse(response, 500)
    }
    return sendAcceptedResponse(response)
  }
}

function sendAcceptedResponse(response) {
  // From the Adyen docs:
  // To ensure that your server is properly accepting notifications,
  // we require you to acknowledge every notification of any type with an [accepted] response.

  return httpUtils.sendResponse(
    response,
    200,
    { 'Content-Type': 'application/json' },
    JSON.stringify({ notificationResponse: '[accepted]' })
  )
}

export { handleNotification }
