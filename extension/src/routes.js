const healthController = require('./api/health/health.controller')
const paymentController = require('./api/payment/payment.controller')
const httpUtils = require('./utils')

const routes = {
  '/': (request, response) => httpUtils.sendResponse(response),
  '/health': healthController.checkHealth,
  '/payments': paymentController.handlePayment
}

module.exports = { routes }
