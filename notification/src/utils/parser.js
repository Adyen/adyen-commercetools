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
    // e.g. generic pending webhooks (eventCode PENDING) carry no additionalData at all,
    // fall back to the commercetools project configured for the Adyen merchant account.
    commercetoolsProjectKey = _getCtpProjectKeyOfMerchantAccount(notification)
  }

  if (_.isEmpty(commercetoolsProjectKey)) {
    throw new Error(
      'Notification can not be processed as "metadata.ctProjectKey" was not found on the notification, ' +
        'nor the path is containing the commercetools project key, ' +
        'nor "ctpProjectKey" is configured for the Adyen merchant account.',
    )
  }

  return config.getCtpConfig(commercetoolsProjectKey)
}

function _getCtpProjectKeyOfMerchantAccount(notification) {
  const adyenMerchantAccount =
    notification?.NotificationRequestItem?.merchantAccountCode
  if (_.isEmpty(adyenMerchantAccount)) return undefined
  try {
    return config.getAdyenConfig(adyenMerchantAccount).ctpProjectKey
  } catch {
    // unknown merchant account: let the caller report the missing project key
    return undefined
  }
}

function getAdyenConfig(notification) {
  const adyenMerchantAccount =
    notification.NotificationRequestItem.merchantAccountCode
  return config.getAdyenConfig(adyenMerchantAccount)
}

export { getCtpProjectConfig, getAdyenConfig }
