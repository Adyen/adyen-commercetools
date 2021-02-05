const _ = require('lodash')
const handler = require('./handler/notification/notification.handler')
const config = require('./config/config')
const logger = require('./utils/logger').getLogger()
const { getNotificationForTracking } = require('./utils/commons')
const setup = require('./config/init/ensure-interface-interaction-custom-type')

let initialised = false

exports.handler = async function (event) {
  const notifications = _.get(event, 'notificationItems', [])
  for (const notification of notifications) {
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
          notification: getNotificationForTracking(notifications),
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
