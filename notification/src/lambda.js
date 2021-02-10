const handler = require('./handler/notification/notification.handler')
const config = require('./config/config')
const logger = require('./utils/logger').getLogger()
const setup = require('./config/init/ensure-interface-interaction-custom-type')

const { getNotificationForTracking } = require('./utils/commons')

let initialised = false

exports.handler = async function (event) {
  const { notificationItems } = event
  if (!notificationItems) {
    const error = new Error('No notification received.')
    logger.error(
      {
        notification: undefined,
        err: error,
      },
      'Unexpected error when processing event'
    )
    throw error
  }
  for (const notification of notificationItems) {
    try {
      const commercetoolsProjectKey =
        notification.NotificationRequestItem.additionalData[
          'metadata.commercetoolsProjectKey'
        ]
      const adyenMerchantAccount =
        notification.NotificationRequestItem.merchantAccountCode
      const ctpProjectConfig = config.getCtpConfig(commercetoolsProjectKey)
      const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)

      if (!initialised) {
        await setup.ensureInterfaceInteractionCustomType(ctpProjectConfig)
        initialised = true
      }
      await handler.processNotification(
        notification,
        adyenConfig.enableHmacSignature,
        ctpProjectConfig
      )
    } catch (e) {
      logger.error(
        {
          notification: getNotificationForTracking(notification),
          err: e,
        },
        'Unexpected error when processing event'
      )
      throw e
    }
  }
  return {
    notificationResponse: '[accepted]',
  }
}
