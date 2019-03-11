const _ = require('lodash')
const httpUtils = require('../../utils/commons')
const config = require('../../config/config').load()
const ctp = require('../../utils/ctp')
const ctpClient = ctp.get(config)
const { processNotifications } = require('../../handler/notification/notification.handler')


// TODO: add JSON schema validation:
// https://github.com/commercetools/commercetools-adyen-integration/issues/9
async function handleNotification (request, response, logger) {
  const body = await httpUtils.collectRequestData(request, response)
  try {
    const notifications = _.get(JSON.parse(body), 'notificationItems', [])
    await processNotifications(notifications, logger, ctpClient)
    return httpUtils.sendResponse(response,
      200,
      { 'Content-Type': 'application/json' },
      { notificationResponse : '[accepted]' })
  } catch (err) {
    logger.error(err, 'Unexpected exception occurred')
    return httpUtils.sendResponse(response, 500)
  }
}

module.exports = { handleNotification }
