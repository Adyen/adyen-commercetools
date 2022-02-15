import healthController from './api/health/health.controller.mjs'
import paymentController from './api/payment/payment.controller.mjs'

const routes = {
  '/': paymentController.processRequest,
  '/health': healthController.processRequest,
}

export default routes
