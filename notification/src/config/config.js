const { merge, isEmpty } = require('lodash')

const configPath = process.env.CONFIG_PATH

let config

function getEnvConfig() {
  return {
    logLevel: process.env.LOG_LEVEL,
    keepAliveTimeout: !Number.isNaN(process.env.KEEP_ALIVE_TIMEOUT)
      ? parseFloat(process.env.KEEP_ALIVE_TIMEOUT, 10)
      : undefined,
    ensureResources: process.env.ENSURE_RESOURCES !== 'false',
  }
}

function getCTPEnvCredentials() {
  return {
    projectKey: process.env.CTP_PROJECT_KEY,
    clientId: process.env.CTP_CLIENT_ID,
    clientSecret: process.env.CTP_CLIENT_SECRET,
    apiUrl:
      process.env.CTP_HOST || 'https://api.europe-west1.gcp.commercetools.com',
    authUrl:
      process.env.CTP_AUTH_URL ||
      'https://auth.europe-west1.gcp.commercetools.com',
  }
}

function getAdyenCredentials() {
  return {
    secretHmacKey: process.env.ADYEN_SECRET_HMAC_KEY,
    enableHmacSignature: process.env.ADYEN_ENABLE_HMAC_SIGNATURE !== 'false',
  }
}

function getFileConfig() {
  let fileConfig = {}
  try {
    fileConfig = require(configPath) // eslint-disable-line
  } catch (err) {
    // config file was not provided
  }

  return fileConfig
}

module.exports = function load() {
  /**
   * Load configuration from several sources in this order (last has highest priority):
   * - default config
   * - file config
   * - ctp credentials from env variables
   * - ctp config
   * - env config
   */
  if (config === undefined) {
    config = merge(
      getEnvConfig(),
      { ctp: getCTPEnvCredentials() },
      { adyen: getAdyenCredentials() },
      getFileConfig()
    )

    if (
      !config.ctp.projectKey ||
      !config.ctp.clientId ||
      !config.ctp.clientSecret
    )
      throw new Error('CTP project credentials are missing')

    if (config.adyen.enableHmacSignature && isEmpty(config.adyen.secretHmacKey))
      throw new Error(
        'The "ADYEN_SECRET_HMAC_KEY" environment variable is missing to be able to verify notifications, ' +
          'please generate a secret HMAC key in Adyen Customer Area ' +
          'or set "ADYEN_ENABLE_HMAC_SIGNATURE=false" to disable the verification feature.'
      )
  }

  return config
}
