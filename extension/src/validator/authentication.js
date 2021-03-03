const config = require('../config/config')

function hasValidAuthorizationHeader(ctpProjectKey, authTokenString) {
  const isAuthEnabled = _isAuthEnabled(ctpProjectKey)

  if (isAuthEnabled) {
    if (!authTokenString || authTokenString.indexOf(' ') < 0) return false

    const ctpConfig = config.getCtpConfig(ctpProjectKey)
    const storedUsername = ctpConfig.username
    const storedPassword = ctpConfig.password
    // Split on a space, the original auth looks like  "Basic *********" and we need the 2nd part
    const encodedAuthToken = authTokenString.split(' ')

    // create a buffer and tell it the data coming in is base64
    const decodedAuthToken = Buffer.from(
      encodedAuthToken[1],
      'base64'
    ).toString()

    const credentialString = decodedAuthToken.split(':')
    const username = credentialString[0]
    const password = credentialString[1]

    return storedUsername === username && storedPassword === password
  }
  return true
}

function _isAuthEnabled(ctpProjectKey) {
  if (!ctpProjectKey) return false

  const ctpConfig = config.getCtpConfig(ctpProjectKey)
  if (ctpConfig) {
    return ctpConfig.authScheme !== undefined
  }
  return false
}

function getAuthorizationRequestHeader(request) {
  if (request.headers) return request.headers['authorization']
  return undefined
}

function generateBasicAuthorizationHeaderValue(ctpProjectKey) {
  const ctpConfig = config.getCtpConfig(ctpProjectKey)
  if (ctpConfig && ctpConfig.username && ctpConfig.password) {
    const username = ctpConfig.username
    const password = ctpConfig.password

    const decodeAuthToken = `${username}:${password}`
    return `Basic ${Buffer.from(decodeAuthToken).toString('base64')}`
  }
  return null
}

module.exports = {
  hasValidAuthorizationHeader,
  getAuthorizationRequestHeader,
  generateBasicAuthorizationHeaderValue,
}
