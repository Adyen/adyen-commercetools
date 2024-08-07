import { randomUUID } from 'crypto'
import http from 'http'
import url from 'url'
import utils from './utils/commons.js'
import { routes } from './routes.js'
import { getLogger } from './utils/logger.js'

const logger = getLogger()

const calculateRequestDuration = (start) => new Date().getTime() - start

function getHandlerNameFromUrl(parts) {
  return parts.path?.split('/')?.slice(-2)?.[0] ?? ''
}

function setupServer() {
  return http.createServer(async (request, response) => {
    const parts = url.parse(request.url)
    const path = getHandlerNameFromUrl(parts)
    const route = routes[`/${path}`]
    const startRequestMs = new Date().getTime()
    const reqId = randomUUID()
    const reqLogger = logger.child({
      reqId,
      path: route,
      method: request.method,
    })

    if (route) {
      try {
        reqLogger.info('incoming request')
        await route(request, response, reqLogger)
        reqLogger.info(
          { responseTime: calculateRequestDuration(startRequestMs) },
          'request completed',
        )
      } catch (err) {
        reqLogger.error(
          { err, responseTime: calculateRequestDuration(startRequestMs) },
          `Unexpected error when processing URL ${JSON.stringify(parts)}`,
        )
        utils.sendResponse(response, 500)
      }
    } else {
      utils.sendResponse(response, 404)
    }
  })
}

export { setupServer }
