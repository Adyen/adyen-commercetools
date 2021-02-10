const _ = require('lodash')
const httpUtils = require('../../utils/commons')

const {
  processNotification,
} = require('../../handler/notification/notification.handler')
const config = require('../../config/config')
const logger = require('../../utils/logger').getLogger()

class ValidationError extends Error {
  constructor({ stack, message, notification, isRecoverable }) {
    super()
    this.stack = stack
    this.message = message
    this.notification = JSON.stringify(notification)
    this.isRecoverable = isRecoverable
  }
}

async function handleNotification(request, response) {
  if (request.method !== 'POST') return httpUtils.sendResponse(response)
  const body = await httpUtils.collectRequestData(request)
  try {
    const notifications = _.get(JSON.parse(body), 'notificationItems', [])
    for (const notification of notifications) {
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
    logger.error(
      { notification: httpUtils.getNotificationForTracking(notification), err },
      'Unexpected exception occurred.'
    )
    if (err.isRecoverable) {
      return httpUtils.sendResponse(response, 500)
    }
    return sendAcceptedResponse(response)
  }
}

function getCtpProjectConfig(notification) {
  let commercetoolsProjectKey
  try {
    commercetoolsProjectKey =
      notification.NotificationRequestItem.additionalData[
        'metadata.commercetoolsProjectKey'
      ]
  } catch (e) {
    throw new ValidationError({
      stack: e.stack,
      notification,
      message:
        'Notification does not contain the field `metadata.commercetoolsProjectKey`.',
      isRecoverable: false,
    })
  }

  let ctpProjectConfig
  try {
    ctpProjectConfig = config.getCtpConfig(commercetoolsProjectKey)
  } catch (e) {
    throw new ValidationError({
      stack: e.stack,
      message: e.message,
      notification,
      isRecoverable: true,
    })
  }
  return ctpProjectConfig
}

function getAdyenConfig(notification) {
  const adyenMerchantAccount =
    notification.NotificationRequestItem.merchantAccountCode
  let adyenConfig
  try {
    adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
  } catch (e) {
    throw new ValidationError({
      stack: e.stack,
      message: e.message,
      notification,
      isRecoverable: true,
    })
  }
  return adyenConfig
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

module.exports = { handleNotification }
