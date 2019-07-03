const _ = require('lodash')

function getEnvConfig () {
  return {
    port: process.env.PORT,
    logLevel: process.env.LOG_LEVEL,
    apiExtensionBaseUrl: process.env.API_EXTENSION_BASE_URL,
    keepAliveTimeout: !Number.isNaN(process.env.KEEP_ALIVE_TIMEOUT) ? parseFloat(process.env.KEEP_ALIVE_TIMEOUT, 10)
      : undefined,
    ensureResources: process.env.ENSURE_RESOURCES !== 'false'
  }
}

function getCTPEnvCredentials () {
  return {
    projectKey: process.env.CTP_PROJECT_KEY,
    clientId: process.env.CTP_CLIENT_ID,
    clientSecret: process.env.CTP_CLIENT_SECRET,
    apiUrl: 'https://api.sphere.io',
    authUrl: 'https://auth.sphere.io'
  }
}

function getAdyenCredentials () {
  return {
    merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
    apiKey: process.env.ADYEN_API_KEY,
    apiBaseUrl: process.env.ADYEN_API_BASE_URL || 'https://checkout-test.adyen.com/v40',
    legacyApiBaseUrl: process.env.ADYEN_LEGACY_API_BASE_URL || 'https://pal-test.adyen.com/pal/servlet/Payment/v40'
  }
}

module.exports.load = () => {
  /**
   * Load configuration from several sources in this order (last has highest priority):
   * - default config
   * - file config
   * - ctp credentials from env variables
   * - ctp config
   * - env config
   */

  const config = _.merge(
    getEnvConfig(),
    { ctp: getCTPEnvCredentials() },
    { adyen: getAdyenCredentials() }
  )

  return config
}
