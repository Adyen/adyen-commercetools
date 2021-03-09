const config = require('../config/config')

function hasValidAuthorizationHeader(ctpProjectKey, authTokenString) {
  if (!authTokenString || authTokenString.indexOf(' ') < 0) return false

  const ctpConfig = config.getCtpConfig(ctpProjectKey)
  const storedUsername = ctpConfig.authentication.username
  const storedPassword = ctpConfig.authentication.password
  // Split on a space, the original auth looks like  "Basic *********" and we need the 2nd part
  const encodedAuthToken = authTokenString.split(' ')

  // create a buffer and tell it the data coming in is base64
  const decodedAuthToken = Buffer.from(encodedAuthToken[1], 'base64').toString()

  const credentialString = decodedAuthToken.split(':')
  const username = credentialString[0]
  const password = credentialString[1]

  return storedUsername === username && storedPassword === password
}

function isBasicAuthEnabled() {
  return config.getModuleConfig().basicAuth
}

function getAuthorizationRequestHeader(request) {
  return request?.headers?.['authorization']
}

function generateBasicAuthorizationHeaderValue(ctpProjectKey) {
  const ctpConfig = config.getCtpConfig(ctpProjectKey)
  if (
    ctpConfig?.authentication?.username &&
    ctpConfig?.authentication?.password
  ) {
    const username = ctpConfig.authentication.username
    const password = ctpConfig.authentication.password

    const decodeAuthToken = `${username}:${password}`
    return `Basic ${Buffer.from(decodeAuthToken).toString('base64')}`
  }
  return null
}

module.exports = {
  hasValidAuthorizationHeader,
  getAuthorizationRequestHeader,
  generateBasicAuthorizationHeaderValue,
  isBasicAuthEnabled,
}
