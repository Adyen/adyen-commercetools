const healthController = require('./api/health/health.controller')
const notificationController = require('./api/notification/notification.controller')

const routes = {
  '/': notificationController.handleNotification,
  '/health': healthController.processRequest,
}

module.exports = { routes }
