const bunyan = require('bunyan')
const config = require('./config/config')

let logger

function collectRequestData(request) {
  return new Promise((resolve) => {
    const data = []

    request.on('data', (chunk) => {
      data.push(chunk)
    })

    request.on('end', () => {
      const dataStr = Buffer.concat(data).toString()
      resolve(dataStr)
    })
  })
}

function sendResponse({ response, statusCode = 200, headers, body }) {
  response.writeHead(statusCode, headers)
  response.end(JSON.stringify(body))
}

function sendGoogleFunctionResponse({ response, statusCode = 200, body }) {
  response.status(statusCode).send(body)
}

function getLogger() {
  if (!logger)
    logger = bunyan.createLogger({
      name: 'ctp-adyen-integration-extension',
      stream: process.stderr,
      level: config.getModuleConfig().logLevel || bunyan.INFO,
    })
  return logger
}

module.exports = {
  collectRequestData,
  sendResponse,
  getLogger,
  sendGoogleFunctionResponse,
}
