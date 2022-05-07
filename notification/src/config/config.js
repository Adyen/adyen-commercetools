const loadConfig = require('./config-loader')

let config

function convertToBoolean(configValue) {
  let removeSensitiveData = configValue !== 'false'
  if (configValue === false) removeSensitiveData = false
  return removeSensitiveData
}

function getModuleConfig() {
  const removeSensitiveData = convertToBoolean(config.removeSensitiveData)
  return {
    removeSensitiveData,
    port: config.port,
    logLevel: config.logLevel,
    keepAliveTimeout: !Number.isNaN(config.keepAliveTimeout)
      ? parseFloat(config.keepAliveTimeout, 10)
      : undefined,
    apiManagementUrl:
      config.apiManagementUrl || 'https://management-test.adyen.com/v1',
  }
}

function getCtpConfig(ctpProjectKey) {
  const ctpConfig = config.commercetools[ctpProjectKey]
  if (!ctpConfig)
    throw new Error(
      `Configuration is not provided. Please update the configuration. ctpProjectKey: [${JSON.stringify(
        ctpProjectKey
      )}]`
    )
  return {
    clientId: ctpConfig.clientId,
    clientSecret: ctpConfig.clientSecret,
    projectKey: ctpProjectKey,
    apiUrl:
      ctpConfig.apiUrl || 'https://api.europe-west1.gcp.commercetools.com',
    authUrl:
      ctpConfig.authUrl || 'https://auth.europe-west1.gcp.commercetools.com',
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

  const enableHmacSignature = convertToBoolean(adyenConfig.enableHmacSignature)
  const generateHmacKey = convertToBoolean(adyenConfig.generateHmacKey)
  return {
    secretHmacKey: adyenConfig.secretHmacKey,
    enableHmacSignature,
    apiKey: adyenConfig.apiKey,
    notificationModuleBaseUrl: adyenConfig.notificationModuleBaseUrl,
    generateHmacKey,
  }
}

function getAllCtpProjectKeys() {
  return Object.keys(config.commercetools)
}

function getAllAdyenMerchantAccounts() {
  return Object.keys(config.adyen)
}

function getAdyenPaymentMethodsToNames() {
  return {
    scheme: 'Credit Card',
    pp: 'PayPal',
    klarna: 'Klarna',
    gpay: 'Google Pay',
    ...(config.adyenPaymentMethodsToNames || {}),
  }
}

function loadAndValidateConfig() {
  config = loadConfig()

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
}

loadAndValidateConfig()

module.exports = {
  getModuleConfig,
  getCtpConfig,
  getAdyenConfig,
  getAllCtpProjectKeys,
  getAllAdyenMerchantAccounts,
  getAdyenPaymentMethodsToNames,
}
