const url = require('url')
const _ = require('lodash')
const config = require('../config/config')

function getCtpProjectConfig(notification, request) {
  let commercetoolsProjectKey =
    notification?.NotificationRequestItem?.additionalData?.[
      `metadata.ctProjectKey`
    ]
  if (!commercetoolsProjectKey && request) {
    const parts = url.parse(request.url)
    commercetoolsProjectKey = parts.path?.split('/')?.[2]
    console.log('asfdjlfdasllksdaf ' + commercetoolsProjectKey)
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
