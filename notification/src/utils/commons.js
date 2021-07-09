const VError = require('verror')

function collectRequestData(request) {
  return new Promise((resolve) => {
    const data = []

    request.on('data', (chunk) => {
      data.push(chunk)
    })

    request.on('end', () => {
      const dataStr = Buffer.concat(data).toString()
      resolve(dataStr)
    })
  })
}

function sendResponse(response, statusCode = 200, headers, data) {
  response.writeHead(statusCode, headers)
  response.end(data)
}

function convertNotificationForTracking(notification) {
  if (notification && notification.NotificationRequestItem) {
    const notificationRequestItem = notification.NotificationRequestItem
    return {
      eventCode: notificationRequestItem.eventCode,
      eventDate: notificationRequestItem.eventDate,
      pspReference: notificationRequestItem.pspReference,
      success: notificationRequestItem.success,
    }
  }
  return notification
}

function getNotificationForTracking(notification) {
  if (notification && Array.isArray(notification)) {
    const notificationListForTracking = []
    notification.forEach((notificationElement) => {
      notificationListForTracking.push(
        convertNotificationForTracking(notificationElement)
      )
    })
    return notificationListForTracking
  }
  return convertNotificationForTracking(notification)
}

/*
 * recoverable: notification delivery can be retried by Adyen (return 500)
 * non recoverable: notification delivery can not be retried by Adyen
 * as it most probably would fail again (return "accepted")
 *
 * If commercetools status code is defined and is 5xx then return `500` to Adyen -> recoverable
 * If during communication with commercetools we got a `NetworkError` then return `500` -> recoverable
 * If commercetools status code is not OK but also not 5xx or 409 then return `accepted` -> non recoverable
 * @param err
 * @returns {boolean}
 */
function isRecoverableError(err) {
  if (err instanceof VError) {
    const { statusCode } = VError.cause(err)
    return statusCode < 200 || statusCode === 409 || statusCode >= 500
  }
  return false
}

module.exports = {
  collectRequestData,
  sendResponse,
  getNotificationForTracking,
  isRecoverableError,
}
