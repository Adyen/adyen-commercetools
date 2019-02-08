const http = require('http')
const url = require('url')
const httpUtils = require('./utils')
const { routes: defaultRoutes } = require('./routes')
require('./config/config')

function setupServer (routes = defaultRoutes) {
  return http.createServer(async (request, response) => {
    const parts = url.parse(request.url)
    const route = routes[parts.pathname]

    if (route)
      await route(request, response)
    else
      httpUtils.sendResponse(response, 404)
  })
}

module.exports = { setupServer }
