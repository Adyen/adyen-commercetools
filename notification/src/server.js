const http = require('http')
const url = require('url')
const utils = require('./utils/commons')
const { routes: defaultRoutes } = require('./routes')
const logger = require('./utils/logger').getLogger()

function setupServer(routes = defaultRoutes) {
  return http.createServer(async (request, response) => {
    const parts = url.parse(request.url)
    const path = parts.path?.split('/')?.slice(-2)?.[0] ?? ''
    const route = routes[`/${path}`]

    if (route)
      try {
        await route(request, response)
      } catch (err) {
        logger.error(
          err,
          `Unexpected error when processing URL ${JSON.stringify(parts)}`
        )
        utils.sendResponse(response, 500)
      }
    else utils.sendResponse(response, 404)
  })
}

module.exports = { setupServer }
