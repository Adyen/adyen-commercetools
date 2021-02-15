const config = require('../config/config')

class ValidationError extends Error {
  constructor({ stack, message, notification, isRecoverable }) {
    super()
    this.stack = stack
    this.message = message
    this.notification = JSON.stringify(notification)
    this.isRecoverable = isRecoverable
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

module.exports = {
  getCtpProjectConfig,
  getAdyenConfig,
}
