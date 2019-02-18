const bunyan = require('bunyan')

function getLogger (config) {
  const NOTIFICATION_MODULE_NAME = 'adyen-ct-connector-notifications'
  return bunyan.createLogger({
    name: NOTIFICATION_MODULE_NAME,
    stream: process.stderr,
    level: config.logLevel
  })
}

module.exports = { getLogger }
