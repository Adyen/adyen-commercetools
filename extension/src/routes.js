const healthController = require('./api/health/health.controller')
const paymentController = require('./api/payment/payment.controller')

const routes = {
  '/': paymentController.processRequest,
  '/health': healthController.processRequest,
}

module.exports = { routes }
