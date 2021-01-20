let config

function getEnvConfig() {
  return {
    port: config.port,
    logLevel: config.logLevel,
    apiExtensionBaseUrl: config.apiExtensionBaseUrl,
    keepAliveTimeout: !Number.isNaN(config.keepAliveTimeout)
      ? parseFloat(config.keepAliveTimeout, 10)
      : undefined,
    ensureResources: config.ensureResources !== 'false',
  }
}

function getCTPEnvCredentials(ctpProjectKey) {
  const ctpConfig = config.commercetools[ctpProjectKey]

  return {
    projectKey: ctpConfig.ctpProjectKey,
    clientId: ctpConfig.ctpClientId,
    clientSecret: ctpConfig.ctpClientSecret,
    apiUrl:
      ctpConfig.ctpHost || 'https://api.europe-west1.gcp.commercetools.com',
    authUrl:
      ctpConfig.ctpAuthUrl || 'https://auth.europe-west1.gcp.commercetools.com',
  }
}

function getAdyenCredentials(adyenMerchantAccount) {
  const adyenConfig = config.adyen[adyenMerchantAccount]

  return {
    merchantAccount: adyenConfig.adyenMerchantAccount,
    apiKey: adyenConfig.adyenApiKey,
    apiBaseUrl:
      adyenConfig.adyenApiBaseUrl || 'https://checkout-test.adyen.com/v52',
    legacyApiBaseUrl:
      adyenConfig.adyenLegacyApiBaseUrl ||
      'https://pal-test.adyen.com/pal/servlet/Payment/v52',
    clientKey: adyenConfig.adyenClientKey || '',
  }
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
  getCTPEnvCredentials,
  getAdyenCredentials,
}
