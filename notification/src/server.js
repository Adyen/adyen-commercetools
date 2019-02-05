const http = require('http')
const url = require('url')
const httpUtils = require('./utils')
const notificationController = require('./api/notification/notification.controller')

const routes = {
  '/': notificationController.handleNotification,
}

module.exports = http.createServer(async (request, response) => {
  const parts = url.parse(request.url)
  const route = routes[parts.pathname]
  if (route)
    return route(request, response)
  else
    return httpUtils.sendResponse(response, 404)
})
