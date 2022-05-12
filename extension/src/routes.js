import healthController from './api/health/health.controller.js'
import paymentController from './api/payment/payment.controller.js'

const routes = {
  '/': paymentController.processRequest,
  '/health': healthController.processRequest,
}

export { routes }
