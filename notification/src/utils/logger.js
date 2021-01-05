const bunyan = require('bunyan')
const { logLevel } = require('../config/config')()

let obj

function getLogger() {
  if (obj === undefined) {
    const NOTIFICATION_MODULE_NAME = 'ctp-adyen-integration-notifications'
    obj = bunyan.createLogger({
      name: NOTIFICATION_MODULE_NAME,
      stream: process.stdout,
      level: logLevel || bunyan.INFO,
      serializers: bunyan.stdSerializers,
    })
  }
  return obj
}

module.exports = { getLogger }
