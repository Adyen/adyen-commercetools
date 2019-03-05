const bunyan = require('bunyan')

function getLogger (logLevel) {
  const NOTIFICATION_MODULE_NAME = 'adyen-ct-connector-notifications'
  return bunyan.createLogger({
    name: NOTIFICATION_MODULE_NAME,
    stream: process.stderr,
    level: logLevel || bunyan.ERROR
  })
}

module.exports = { getLogger }
