const http = require('http')
const url = require('url')
const { utils } = require('commercetools-adyen-integration-commons')
const { routes: defaultRoutes } = require('./routes')

const logger = utils.getLogger()

function setupServer(routes = defaultRoutes) {
  return http.createServer(async (request, response) => {
    const parts = url.parse(request.url)
    const route = routes[parts.pathname]

    if (route)
      try {
        await route(request, response)
      } catch (e) {
        logger.error(
          e,
          `Unexpected error when processing URL ${JSON.stringify(parts)}`
        )
        utils.sendResponse({ response, statusCode: 500 })
      }
    else utils.sendResponse({ response, statusCode: 404 })
  })
}

module.exports = { setupServer }
