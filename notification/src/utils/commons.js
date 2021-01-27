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

function getNotificationForTracking(notification) {
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

module.exports = {
  collectRequestData,
  sendResponse,
  getNotificationForTracking,
}
