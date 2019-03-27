const bunyan = require('bunyan')
let obj

function getLogger (logLevel) {
  if( obj === undefined ) {
    const NOTIFICATION_MODULE_NAME = 'ctp-adyen-integration-notifications'
    obj = bunyan.createLogger({
      name: NOTIFICATION_MODULE_NAME,
      stream: process.stderr,
      level: logLevel || bunyan.ERROR
    })
  }
  return obj
}

module.exports = { getLogger }
