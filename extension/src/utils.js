const bunyan = require('bunyan')
const configLoader = require('./config/config')

const config = configLoader.load()

let logger

function collectRequestData (request) {
  return new Promise((resolve) => {
    const data = []

    request.on('data', (chunk) => {
      data.push(chunk)
    })

    request.on('end', () => {
      resolve(data)
    })
  })
}

function sendResponse ({
  response, statusCode = 200, headers, data
}) {
  response.writeHead(statusCode, headers)
  response.end(JSON.stringify(data))
}

function getLogger () {
  if (!logger)
    logger = bunyan.createLogger({
      name: 'ctp-adyen-integration-extension',
      stream: process.stderr,
      level: config.logLevel || bunyan.ERROR
    })
  return logger
}

module.exports = {
  collectRequestData,
  sendResponse,
  getLogger
}
