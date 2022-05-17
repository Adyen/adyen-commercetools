const _ = require('lodash')
const config = require('../config/config')

function getCtpProjectConfig(notification, path) {
  console.log(`path is ${JSON.stringify(path)}`)
  let commercetoolsProjectKey =
    notification?.NotificationRequestItem?.additionalData?.[
      `metadata.ctProjectKey`
    ]
  if (!commercetoolsProjectKey && path) {
    commercetoolsProjectKey = path.split('/')?.slice(-1)?.[0]
  }
  console.log(`commercetoolsProjectKey is ${JSON.stringify(commercetoolsProjectKey)}`)

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
