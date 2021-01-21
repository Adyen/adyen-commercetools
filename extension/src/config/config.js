let config

function getEnvConfig() {
  return {
    port: config.port,
    logLevel: config.logLevel,
    apiExtensionBaseUrl: config.apiExtensionBaseUrl,
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
    apiUrl: ctpConfig.host || 'https://api.europe-west1.gcp.commercetools.com',
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
    apiKey: adyenConfig.apiKey,
    apiBaseUrl: adyenConfig.apiBaseUrl || 'https://checkout-test.adyen.com/v52',
    legacyApiBaseUrl:
      adyenConfig.legacyApiBaseUrl ||
      'https://pal-test.adyen.com/pal/servlet/Payment/v52',
    clientKey: adyenConfig.clientKey || '',
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
}

loadAndValidateConfig()

module.exports = {
  getEnvConfig,
  getCtpConfig,
  getAdyenConfig,
  getAllCtpProjectKeys,
  getAllAdyenMerchantAccounts,
}
