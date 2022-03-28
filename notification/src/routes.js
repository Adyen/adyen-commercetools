import healthController from './api/health/health.controller'
import notificationController from './api/notification/notification.controller'

const routes = {
  '/': notificationController.handleNotification,
  '/health': healthController.processRequest,
}

export { routes }
