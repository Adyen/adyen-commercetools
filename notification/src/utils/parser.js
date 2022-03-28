import config from '../config/config'

function getCtpProjectConfig(notification) {
  const commercetoolsProjectKey =
    notification?.NotificationRequestItem?.additionalData?.[
      `metadata.ctProjectKey`
    ]
  if (!commercetoolsProjectKey) {
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

export { getCtpProjectConfig, getAdyenConfig }
