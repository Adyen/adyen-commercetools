import { randomUUID } from 'crypto'
import http from 'http'
import url from 'url'
import utils from './utils.js'
import { routes } from './routes.js'

const logger = utils.getLogger()

const calculateRequestDuration = (start) => new Date().getTime() - start

function setupServer() {
  return http.createServer(async (request, response) => {
    const parts = url.parse(request.url)
    const route = routes[parts.pathname]
    const startRequestMs = new Date().getTime()
    const reqId = randomUUID()
    const reqLogger = logger.child({ reqId, path: route, method: request.method })

    if (route) {
      try {
        reqLogger.info('incoming request')
        await route(request, response, reqLogger)
        reqLogger.info(
          { responseTime: calculateRequestDuration(startRequestMs) },
          'request completed'
        );
      } catch (e) {
        reqLogger.error(
          e,
          `Unexpected error when processing URL ${JSON.stringify(parts)}`,
        )
        utils.sendResponse({ response, statusCode: 500 })
      }
    } else {
      utils.sendResponse({ response, statusCode: 404 })
    }
  })
}

export { setupServer }
