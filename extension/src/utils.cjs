const bunyan = require('bunyan')
const { serializeError } = require('serialize-error')
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

function sendResponse({ response, statusCode = 200, headers, data }) {
  response.writeHead(statusCode, headers)
  response.end(JSON.stringify(data))
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

function handleUnexpectedPaymentError(paymentObj, err) {
  const errorMessage = `Unexpected error (Payment ID: ${paymentObj?.id}): ${err.message}.`
  const errorStackTrace = `Unexpected error (Payment ID: ${
    paymentObj?.id
  }): ${JSON.stringify(serializeError(err))}`
  getLogger().error(errorStackTrace)
  return {
    errors: [
      {
        code: 'General',
        message: errorMessage,
      },
    ],
  }
}

module.exports = {
  collectRequestData,
  sendResponse,
  getLogger,
  handleUnexpectedPaymentError,
}
