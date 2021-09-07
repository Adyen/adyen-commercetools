const bunyan = require('bunyan')
const { logLevel } = require('../config/config').getModuleConfig()

let obj

function getLogger() {
  if (obj === undefined) {
    const NOTIFICATION_MODULE_NAME = 'ctp-adyen-integration-notifications'
    obj = bunyan.createLogger({
      name: NOTIFICATION_MODULE_NAME,
      stream: process.stdout,
      level: logLevel || bunyan.INFO,
      serializers: {
        err: bunyan.stdSerializers.err,
        cause: bunyan.stdSerializers.err,
      },
    })
  }
  return obj
}

module.exports = { getLogger }
