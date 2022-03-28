import http from 'http'
import url from 'url'
import utils from './utils/commons'
import routes from './routes'
import logg from './utils/logger'

const logger = logg.getLogger()

function setupServer() {
  return http.createServer(async (request, response) => {
    const parts = url.parse(request.url)
    const route = routes[parts.pathname]

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

export { setupServer }
