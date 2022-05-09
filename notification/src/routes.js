import { processRequest } from './api/health/health.controller.js'
import notificationController from './api/notification/notification.controller.js'

const routes = {
  '/': notificationController.handleNotification,
  '/health': processRequest,
}

export { routes }
