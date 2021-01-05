const notificationController = require('./api/notification/notification.controller')

const routes = {
  '/': notificationController.handleNotification,
}

module.exports = { routes }
