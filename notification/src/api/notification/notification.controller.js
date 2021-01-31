const _ = require('lodash')
const httpUtils = require('../../utils/commons')
const {
  processNotification,
} = require('../../handler/notification/notification.handler')
const config = require('../../config/config')
const logger = require('../../utils/logger').getLogger()

class ValidationError extends Error {
  constructor(details, message) {
    super()
    this.details = details
    this.message = message
  }
}

// TODO: add JSON schema validation:
// https://github.com/commercetools/commercetools-adyen-integration/issues/9
async function handleNotification(request, response) {
  if (request.method !== 'POST') return httpUtils.sendResponse(response)
  const body = await httpUtils.collectRequestData(request)
  try {
    const notifications = _.get(JSON.parse(body), 'notificationItems', [])
    for (const notification of notifications) {
      let ctpProjectConfig
      let adyenConfig
      try {
        ctpProjectConfig = getCtpProjectConfig(notification)
        adyenConfig = getAdyenConfig(notification)
      } catch (e) {
        if (e instanceof ValidationError) {
          logger.error(e.details, e.message)
          break
        }
      }

      await processNotification(
        notification,
        adyenConfig.enableHmacSignature,
        ctpProjectConfig
      )
    }
    return sendAcceptedResponse(response)
  } catch (err) {
    logger.error(
      { adyenRequestBody: `${body}`, err },
      'Unexpected exception occurred.'
    )
    return httpUtils.sendResponse(response, 500)
  }
}

function getCtpProjectConfig(notification) {
  let commercetoolsProjectKey
  try {
    commercetoolsProjectKey =
      notification.NotificationRequestItem.additionalData[
        'metadata.commercetoolsProjectKey'
      ]
  } catch {
    throw new ValidationError(
      { adyenRequestNotification: `${JSON.stringify(notification)}` },
      'Notification does not contain the field `metadata.commercetoolsProjectKey`.'
    )
  }
  const ctpProjectConfig = config.getCtpConfig(commercetoolsProjectKey)

  if (!ctpProjectConfig) {
    throw new ValidationError(
      {
        adyenRequestNotification: JSON.stringify(notification),
        commercetoolsProjectKey,
      },
      `commercetools project does not exist.`
    )
  }

  return ctpProjectConfig
}

function getAdyenConfig(notification) {
  const adyenMerchantAccount =
    notification.NotificationRequestItem.merchantAccountCode
  const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)

  if (!adyenConfig) {
    throw new ValidationError(
      {
        adyenRequestNotification: JSON.stringify(notification),
        adyenMerchantAccount,
      },
      `Adyen config does not exist.`
    )
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
