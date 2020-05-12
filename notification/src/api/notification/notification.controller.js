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
      return sendAcceptedResponse(response)
    }

    // TODO(ahmetoz) https://github.com/commercetools/commercetools-adyen-integration/issues/272
    await processNotifications(notification, ctpClient)
    return sendAcceptedResponse(response)
  } catch (err) {
    logger.error({ adyenRequestBody: `${body}`, err },
      'Unexpected exception occurred.')
    return httpUtils.sendResponse(response, 500)
  }
}

function sendAcceptedResponse(response) {
  // From the Adyen docs:
  // To ensure that your server is properly accepting notifications,
  // we require you to acknowledge every notification of any type with an [accepted] response.

  return httpUtils.sendResponse(response,
    200,
    { 'Content-Type': 'application/json' },
    JSON.stringify({ notificationResponse: '[accepted]' }))
}

module.exports = { handleNotification }
