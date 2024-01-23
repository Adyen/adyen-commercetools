import _ from 'lodash'
import config from '../config/config.js'

function getCtpProjectConfig(notification, path) {
  let commercetoolsProjectKey =
    notification?.NotificationRequestItem?.additionalData?.[
      `metadata.ctProjectKey`
    ]
  if (!commercetoolsProjectKey && path) {
    commercetoolsProjectKey = path.split('/')?.slice(-1)?.[0]
  }

  if (_.isEmpty(commercetoolsProjectKey)) {
    throw new Error(
      'Notification can not be processed as "metadata.ctProjectKey" was not found on the notification ' +
        'nor the path is containing the commercetools project key.',
    )
  }

  return config.getCtpConfig(commercetoolsProjectKey)
}

function getAdyenConfig(notification) {
  const adyenMerchantAccount =
    notification.NotificationRequestItem.merchantAccountCode
  return config.getAdyenConfig(adyenMerchantAccount)
}

export { getCtpProjectConfig, getAdyenConfig }
