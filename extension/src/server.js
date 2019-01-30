const http = require('http')
const url = require('url')
const httpUtils = require('./utils')
const healthController = require('./api/health/health.controller')
const paymentController = require('./api/payment/payment.controller')
require('./config/config')

const routes = {
  '/': (request, response) => httpUtils.sendResponse(response),
  '/health': healthController.checkHealth,
  '/payments': paymentController.handlePayment
}

module.exports = http.createServer(async (request, response) => {
  const parts = url.parse(request.url)
  const route = routes[parts.pathname]

  if (route)
    await route(request, response)
  else
    httpUtils.sendResponse(response, 404)
})
