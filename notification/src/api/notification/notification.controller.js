const _ = require('lodash')
const httpUtils = require('../../utils/commons')
const ctp = require('../../utils/ctp')
const { hasValidHmacSignature } = require('../../utils/hmacValidator')
const { processNotifications } = require('../../handler/notification/notification.handler')
const config = require('../../config/config')()
const logger = require('../../utils/logger').getLogger()

const ctpClient = ctp.get(config)

// TODO: add JSON schema validation:
// https://github.com/commercetools/commercetools-adyen-integration/issues/9
async function handleNotification (request, response) {
  if (request.method !== 'POST')
    return httpUtils.sendResponse(response)
  const body = await httpUtils.collectRequestData(request)
  try {
    const notification = _.get(JSON.parse(body), 'notificationItems', [])
    if (!hasValidHmacSignature(notification)) {
      logger.error('Notification does not have a valid HMAC signature, ' +
        'please confirm that the notification was sent by Adyen, ' +
        `and was not modified during transmission. Notification: ${JSON.stringify(notification)}`)

      // TODO(ahmetoz): clarify the correct flow or best practice with Adyen.
      return httpUtils.sendResponse(response, 500)
    }

    // TODO(ahmetoz) https://github.com/commercetools/commercetools-adyen-integration/issues/272
    await processNotifications(notification, ctpClient)
    return httpUtils.sendResponse(response,
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ notificationResponse: '[accepted]' }))
  } catch (err) {
    logger.error({ adyenRequestBody: `${body}`, err },
      'Unexpected exception occurred.')
    return httpUtils.sendResponse(response, 500)
  }
}

module.exports = { handleNotification }
