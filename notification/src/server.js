const http = require('http')
const url = require('url')
const httpUtils = require('./utils/commons')
const notificationController = require('./api/notification/notification.controller')
const config = require('./config/config').load()
require('./utils/logger').getLogger(config.logLevel)

const routes = {
  '/': notificationController.handleNotification
}

module.exports = http.createServer(async (request, response) => {
  const parts = url.parse(request.url)
  const route = routes[parts.pathname]
  if (route)
    return route(request, response)
  return httpUtils.sendResponse(response, 404)
})
