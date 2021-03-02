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

function isAuthEnabled(ctpProjectKey) {
  if (!ctpProjectKey) return false

  const ctpConfig = config.getCtpConfig(ctpProjectKey)
  if (ctpConfig) {
    return ctpConfig.username !== undefined && ctpConfig.password !== undefined
  }
  return false
}

function generateAuthorizationHeaderValue(ctpProjectKey) {
  const ctpConfig = config.getCtpConfig(ctpProjectKey)
  if (ctpConfig && ctpConfig.username && ctpConfig.password) {
    const username = ctpConfig.username
    const password = ctpConfig.password

    const decodeAuthToken = `${username}:${password}`
    return `Basic ${Buffer.from(decodeAuthToken).toString('base64')}`
  }
  return null
}

function getAuthorizationHeader(request) {
  if (request.headers) return request.headers['authorization']
  return ''
}

module.exports = {
  collectRequestData,
  sendResponse,
  getLogger,
  isAuthEnabled,
  getAuthorizationHeader,
  generateAuthorizationHeaderValue,
}
