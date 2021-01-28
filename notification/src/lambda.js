const _ = require('lodash')
const ctp = require('./utils/ctp')
const handler = require('./handler/notification/notification.handler')
const config = require('./config/config')
const logger = require('./utils/logger').getLogger()

const setup = require('./config/init/ensure-interface-interaction-custom-type')

let initialised = false

// TODO: add JSON schema validation:
// https://github.com/commercetools/commercetools-adyen-integration/issues/9
exports.handler = async function (event) {
  try {
    const notifications = _.get(event, 'notificationItems', [])
    for (const notification of notifications) {
      const ctpProjectKey =
        notification.NotificationRequestItem.additionalData[
          'metadata.commercetoolsProjectKey'
          ]
      const adyenMerchantAccount = notification.NotificationRequestItem.merchantAccountCode
      const ctpProjectConfig = config.getCtpConfig(ctpProjectKey)
      const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
      const ctpClient = ctp.get(ctpProjectConfig)

      if (!initialised) {
        await setup.ensureInterfaceInteractionCustomType(ctpClient)
        initialised = true
      }
      await handler.processNotification(notification, adyenConfig.enableHmacSignature, ctpClient)
    }
    return {
      notificationResponse: '[accepted]',
    }
  } catch (e) {
    logger.error(
      e,
      `Unexpected error when processing event ${JSON.stringify(event)}`
    )
    throw e
  }
}
