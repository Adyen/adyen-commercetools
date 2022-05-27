import { processRequest } from './api/health/health.controller.js'
import { handleNotification } from './api/notification/notification.controller.js'

const routes = {
  '/': handleNotification,
  '/notifications': handleNotification,
  '/health': processRequest,
}

export { routes }
