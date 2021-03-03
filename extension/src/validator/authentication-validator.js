const config = require('../config/config')

function isAuthorized(paymentObject, authTokenString) {
  const ctpProjectKey = paymentObject.custom.fields.commercetoolsProjectKey
  const isAuthEnabled = _isAuthEnabled(ctpProjectKey)

  console.log(`isAuthEnabled : ${isAuthEnabled}`)
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

module.exports = {
  isAuthorized,
}
