import healthController from './api/health/health.controller.js'
const notificationController = require('./api/notification/notification.controller')

const routes = {
  '/': notificationController.handleNotification,
  '/notifications': notificationController.handleNotification,
  '/health': healthController.processRequest,
}

module.exports = { routes }
