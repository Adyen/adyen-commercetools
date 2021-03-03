let config

function getModuleConfig() {
  return {
    port: config.port,
    logLevel: config.logLevel,
    apiExtensionBaseUrl: config.apiExtensionBaseUrl, // used only for development purpose
    keepAliveTimeout: !Number.isNaN(config.keepAliveTimeout)
      ? parseFloat(config.keepAliveTimeout, 10)
      : undefined,
  }
}

function _isValidAuthenticationConfig(ctpConfig) {
  if (ctpConfig.authentication) {
    if (
      !ctpConfig.authentication.scheme ||
      !ctpConfig.authentication.username ||
      !ctpConfig.authentication.password
    ) {
      // scheme, username and password must be all provided if authentication object exists
      return false
    }
    if (ctpConfig.authentication.scheme.toLowerCase() !== 'basic') {
      // Accept basic authentication only
      return false
    }
    return true
  }
  return true
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
    authScheme: ctpConfig.authentication
      ? ctpConfig.authentication.scheme
      : undefined,
    username: ctpConfig.authentication
      ? ctpConfig.authentication.username
      : undefined,
    password: ctpConfig.authentication
      ? ctpConfig.authentication.password
      : undefined,
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
    clientKey: adyenConfig.clientKey || '', // used only for development purpose
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
    if (!_isValidAuthenticationConfig(ctpConfig)) {
      throw new Error(
        `Authentication is not properly configured. Please update the configuration. ctpProjectKey: [${JSON.stringify(
          ctpProjectKey
        )}]`
      )
    }
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
