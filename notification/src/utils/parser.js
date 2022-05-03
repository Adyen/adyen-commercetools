const url = require('url')
const _ = require('lodash')
const config = require('../config/config')
const logger = require('./logger').getLogger()

function getCtpProjectConfig(notification, request) {
  let commercetoolsProjectKey =
    notification?.NotificationRequestItem?.additionalData?.[
      `metadata.ctProjectKey`
    ]
  logger.error(`DEBUG: request.url: ${JSON.stringify(request.url)}`)
  if (!commercetoolsProjectKey && request) {
    const parts = url.parse(request.url)
    commercetoolsProjectKey = parts.path?.split('/')?.slice(-1)?.[0]
    logger.error(`DEBUG: parts: ${JSON.stringify(parts)}`)
  }

  if (_.isEmpty(commercetoolsProjectKey)) {
    throw new Error(
      'Notification can not be processed as "metadata.ctProjectKey"  was not found on the notification.'
    )
  }

  return config.getCtpConfig(commercetoolsProjectKey)
}

function getAdyenConfig(notification) {
  const adyenMerchantAccount =
    notification.NotificationRequestItem.merchantAccountCode
  return config.getAdyenConfig(adyenMerchantAccount)
}

module.exports = {
  getCtpProjectConfig,
  getAdyenConfig,
}
