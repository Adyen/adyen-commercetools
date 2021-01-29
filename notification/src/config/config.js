const { isEmpty } = require('lodash')

let config

function getModuleConfig() {
  return {
    port: config.port,
    logLevel: config.logLevel,
    keepAliveTimeout: !Number.isNaN(config.keepAliveTimeout)
      ? parseFloat(config.keepAliveTimeout, 10)
      : undefined,
  }
}

function getCtpConfig(ctpProjectKey) {
  const ctpConfig = config.commercetools[ctpProjectKey]
  if (!ctpConfig)
    throw new Error(
      `Configuration for ctpProjectKey is not provided. Please update the configuration. ${JSON.stringify(
        ctpProjectKey
      )}`
    )
  return {
    clientId: ctpConfig.clientId,
    clientSecret: ctpConfig.clientSecret,
    projectKey: ctpProjectKey,
    apiUrl:
      ctpConfig.apiUrl || 'https://api.europe-west1.gcp.commercetools.com',
    authUrl:
      ctpConfig.authUrl || 'https://auth.europe-west1.gcp.commercetools.com',
    ensureResources: config.ensureResources !== 'false',
  }
}

function getAdyenConfig(adyenMerchantAccount) {
  const adyenConfig = config.adyen[adyenMerchantAccount]
  if (!adyenConfig)
    throw new Error(
      `Configuration for adyenMerchantAccount is not provided. Please update the configuration: ${JSON.stringify(
        adyenMerchantAccount
      )}`
    )
  return {
    secretHmacKey: adyenConfig.secretHmacKey,
    enableHmacSignature: adyenConfig.enableHmacSignature !== 'false',
  }
}

function getAllCtpProjectKeys() {
  return Object.keys(config.commercetools)
}

function getAllAdyenMerchantAccounts() {
  return Object.keys(config.adyen)
}

function loadAndValidateConfig() {
  try {
    config = JSON.parse(process.env.ADYEN_INTEGRATION_CONFIG)
  } catch (e) {
    throw new Error(
      'Adyen integration configuration is not provided in the JSON format'
    )
  }
  const numberOfCtpConfigs = Object.keys(config.commercetools).length
  const numberOfAdyenConfigs = Object.keys(config.adyen).length
  if (numberOfCtpConfigs === 0)
    throw new Error(
      'Please add at least one commercetools project to the config'
    )
  if (numberOfAdyenConfigs === 0)
    throw new Error(
      'Please add at least one Adyen merchant account to the config'
    )

  for (const [ctpProjectKey, ctpConfig] of Object.entries(
    config.commercetools
  )) {
    if (!ctpConfig.clientId || !ctpConfig.clientSecret)
      throw new Error(
        `[${ctpProjectKey}]: CTP project credentials are missing. ` +
          'Please verify that all projects have projectKey, clientId and clientSecret'
      )
  }

  for (const [adyenMerchantAccount, adyenConfig] of Object.entries(
    config.adyen
  )) {
    if (adyenConfig.enableHmacSignature !== 'false' && isEmpty(adyenConfig.secretHmacKey))
      throw new Error(
        `[${adyenMerchantAccount}]: The "secretHmacKey" config variable is missing to be able to verify ` +
          `notifications, please generate a secret HMAC key in Adyen Customer Area ` +
          `or set "enableHmacSignature=false" to disable the verification feature.`
      )
  }
}

loadAndValidateConfig()

module.exports = {
  getModuleConfig,
  getCtpConfig,
  getAdyenConfig,
  getAllCtpProjectKeys,
  getAllAdyenMerchantAccounts,
}
