const { merge } = require('lodash')

const configPath = process.env.CONFIG_PATH

let config

function getEnvConfig () {
  return {
    logLevel: process.env.LOG_LEVEL,
    keepAliveTimeout: !Number.isNaN(process.env.KEEP_ALIVE_TIMEOUT) ? parseFloat(process.env.KEEP_ALIVE_TIMEOUT, 10)
      : undefined
  }
}

function getCTPEnvCredentials () {
  return {
    projectKey: process.env.CTP_PROJECT_KEY,
    clientId: process.env.CTP_CLIENT_ID,
    clientSecret: process.env.CTP_CLIENT_SECRET
  }
}

function getFileConfig () {
  let fileConfig = {}
  try {
    fileConfig = require(configPath) // eslint-disable-line
  } catch (err) {
    // config file was not provided
  }

  return fileConfig
}

module.exports = function load () {
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
      getFileConfig()
    )
    // raise an exception when there are no CTP credentials
    if (!config.ctp.projectKey || !config.ctp.clientId || !config.ctp.clientSecret)
      throw new Error('CTP project credentials are missing')
  }

  return config
}
