const _ = require('lodash')
const httpUtils = require('../../utils/commons')
const ctp = require('../../utils/ctp')
const { processNotifications } = require('../../handler/notification/notification.handler')
const config = require('../../config/config').load()
const logger = require('../../utils/logger').getLogger()
const ctpClient = ctp.get(config)

// TODO: add JSON schema validation:
// https://github.com/commercetools/commercetools-adyen-integration/issues/9
async function handleNotification (request, response) {
  const body = await httpUtils.collectRequestData(request)
  try {
    const notifications = _.get(JSON.parse(body), 'notificationItems', [])
    await processNotifications(notifications, ctpClient)
    return httpUtils.sendResponse(response,
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ notificationResponse: '[accepted]' }))
  } catch (err) {
    logger.error(err, 'Unexpected exception occurred')
    return httpUtils.sendResponse(response, 500)
  }
}

module.exports = { handleNotification }
