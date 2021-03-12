let config

function getModuleConfig() {
  return {
    port: config.port,
    logLevel: config.logLevel,
    apiExtensionBaseUrl: config.apiExtensionBaseUrl, // used only for development purpose
    basicAuth: config.basicAuth || false,
    keepAliveTimeout: !Number.isNaN(config.keepAliveTimeout)
      ? parseFloat(config.keepAliveTimeout, 10)
      : undefined,
  }
}

function _validateAuthenticationConfig(ctpConfig) {
  if (getModuleConfig().basicAuth === true && !ctpConfig.authentication) {
    return {
      errorMessage:
        'Basic authentication is enabled but authentication setting is missing.',
    }
  }

  if (ctpConfig.authentication) {
    if (
      ctpConfig.authentication.scheme?.toLowerCase() !== 'basic' ||
      !ctpConfig.authentication.username ||
      !ctpConfig.authentication.password
    ) {
      // scheme must be basic type, and username and password must be all provided if authentication object exists
      return {
        errorMessage:
          'Attributes (scheme, username or password) is missing in authentication setting.',
      }
    }
    return null
  }
  return null
}

function getCtpConfig(ctpProjectKey) {
  const ctpConfig = config.commercetools[ctpProjectKey]
  if (!ctpConfig)
    throw new Error(
      `Configuration is not provided. Please update the configuration. ctpProjectKey: [${ctpProjectKey}]`
    )
  const result = {
    clientId: ctpConfig.clientId,
    clientSecret: ctpConfig.clientSecret,
    projectKey: ctpProjectKey,
    apiUrl:
      ctpConfig.apiUrl || 'https://api.europe-west1.gcp.commercetools.com',
    authUrl:
      ctpConfig.authUrl || 'https://auth.europe-west1.gcp.commercetools.com',
  }
  if (ctpConfig.authentication) {
    result.authentication = {
      scheme: ctpConfig.authentication.scheme,
      username: ctpConfig.authentication.username,
      password: ctpConfig.authentication.password,
    }
  }
  return result
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
    const error = _validateAuthenticationConfig(ctpConfig)
    if (error) {
      throw new Error(
        `Authentication is not properly configured. Please update the configuration. error : [${error?.errorMessage}] 
        ctpProjectKey: [${ctpProjectKey}]`
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
