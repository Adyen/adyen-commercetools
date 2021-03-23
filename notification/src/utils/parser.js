const config = require('../config/config')

class ValidationError extends Error {
  constructor({ stack, message }) {
    super()
    this.stack = stack
    this.message = message
    this.isRecoverable = true
  }
}

function getCtpProjectConfig(notification) {
  const commercetoolsProjectKey =
    notification?.NotificationRequestItem?.additionalData?.[
      `metadata.commercetoolsProjectKey`
    ]
  if (!commercetoolsProjectKey) {
    throw new ValidationError({
      message:
        'Notification can not be processed as "commercetoolsProjectKey"  was not found on the notification.',
    })
  }

  let ctpProjectConfig
  try {
    ctpProjectConfig = config.getCtpConfig(commercetoolsProjectKey)
  } catch (e) {
    throw new ValidationError({
      stack: e.stack,
      message: e.message,
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
    })
  }
  return adyenConfig
}

module.exports = {
  getCtpProjectConfig,
  getAdyenConfig,
}
