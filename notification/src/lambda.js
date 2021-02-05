const ctp = require('./utils/ctp')
const handler = require('./handler/notification/notification.handler')
const config = require('./config/config')()
const logger = require('./utils/logger').getLogger()
const { getNotificationForTracking } = require('./utils/commons')
const setup = require('./config/init/ensure-interface-interaction-custom-type')

const ctpClient = ctp.get(config)

let initialised = false

exports.handler = async function (event) {
  const { notificationItems } = event
  try {
    if (!initialised) {
      await setup.ensureInterfaceInteractionCustomType(ctpClient)
      initialised = true
    }
    if (!notificationItems) {
      throw new Error('No notification received.')
    }

    await handler.processNotifications(notificationItems, ctpClient)
    return {
      notificationResponse: '[accepted]',
    }
  } catch (e) {
    logger.error(
      {
        notification: getNotificationForTracking(notificationItems),
        err: e,
      },
      'Unexpected error when processing event'
    )
    throw e
  }
}
