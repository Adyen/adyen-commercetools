import healthController from './api/health/health.controller.js'
import paymentController from './api/payment/payment.controller.cjs'

export const routes = {
  '/': paymentController.processRequest,
  '/health': healthController.processRequest,
}
