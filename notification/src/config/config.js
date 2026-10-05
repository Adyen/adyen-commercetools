import lodash from 'lodash'
import { loadConfig } from './config-loader.js'

const { isEmpty } = lodash
let config

function getModuleConfig() {
  let removeSensitiveData = config.removeSensitiveData !== 'false'
  if (config.removeSensitiveData === false) removeSensitiveData = false
  return {
    removeSensitiveData,
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
      `Configuration is not provided. Please update the configuration. ctpProjectKey: [${JSON.stringify(
        ctpProjectKey,
      )}]`,
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
        adyenMerchantAccount,
      )}`,
    )

  let enableHmacSignature = adyenConfig.enableHmacSignature !== 'false'
  if (adyenConfig.enableHmacSignature === false) enableHmacSignature = false
  return {
    secretHmacKey: adyenConfig.secretHmacKey,
    notificationBaseUrl:
      process.env.CONNECT_SERVICE_URL ?? adyenConfig.notificationBaseUrl,
    enableHmacSignature,
    apiKey: adyenConfig.apiKey,
    enableBasicAuth: _getValueOfBooleanFlag(adyenConfig.enableBasicAuth, false),
    ...(adyenConfig.ctpProjectKey
      ? { ctpProjectKey: adyenConfig.ctpProjectKey }
      : {}),
    ...(adyenConfig.authentication
      ? {
          authentication: {
            scheme: adyenConfig.authentication.scheme,
            username: adyenConfig.authentication.username,
            password: adyenConfig.authentication.password,
          },
        }
      : {}),
  }
}

function _getValueOfBooleanFlag(value, defaultValue) {
  if (value === undefined) {
    return defaultValue
  }

  if (value === true || value === 'true') {
    return true
  }

  if (value === false || value === 'false') {
    return false
  }

  return defaultValue
}

/**
 * Validates the basic authentication settings of an Adyen merchant account.
 * The credentials protect the Adyen generic pending webhook, which does not support HMAC signatures.
 * @returns {string|null} error message when the configuration is invalid, otherwise null
 */
function _validateAuthenticationConfig(adyenConfig) {
  const enableBasicAuth = _getValueOfBooleanFlag(
    adyenConfig.enableBasicAuth,
    false,
  )
  if (enableBasicAuth && !adyenConfig.authentication) {
    return (
      'Basic authentication is enabled but the "authentication" setting is missing. ' +
      'It is required to protect the Adyen generic pending webhook.'
    )
  }

  if (adyenConfig.authentication) {
    if (
      adyenConfig.authentication.scheme?.toLowerCase() !== 'basic' ||
      !adyenConfig.authentication.username ||
      !adyenConfig.authentication.password
    ) {
      // scheme must be basic type, and username and password must be all provided if authentication object exists
      return 'Attributes (scheme, username or password) is missing in "authentication" setting.'
    }
  }
  return null
}

/**
 * Validates the `ctpProjectKey` attribute of an Adyen merchant account.
 * Adyen generic pending webhooks carry no `metadata.ctProjectKey`, so the commercetools project of a `PENDING`
 * notification can only be resolved from the webhook URL. The attribute is therefore mandatory when basic
 * authentication (and with it the generic pending webhook) is enabled.
 * @returns {string|null} error message when the configuration is invalid, otherwise null
 */
function _validateCtpProjectKeyConfig(adyenConfig, ctpProjectKeys) {
  const enableBasicAuth = _getValueOfBooleanFlag(
    adyenConfig.enableBasicAuth,
    false,
  )
  if (enableBasicAuth && isEmpty(adyenConfig.ctpProjectKey)) {
    return (
      'Basic authentication is enabled but the "ctpProjectKey" setting is missing. ' +
      'It is required to resolve the commercetools project of Adyen generic pending webhooks.'
    )
  }

  if (
    !isEmpty(adyenConfig.ctpProjectKey) &&
    !ctpProjectKeys.includes(adyenConfig.ctpProjectKey)
  ) {
    return (
      `The "ctpProjectKey" setting [${adyenConfig.ctpProjectKey}] does not match any ` +
      'commercetools project of the configuration.'
    )
  }
  return null
}

function getAllCtpProjectKeys() {
  return Object.keys(config.commercetools)
}

function getAllAdyenMerchantAccounts() {
  return Object.keys(config.adyen)
}

function getAdyenPaymentMethodsToNames() {
  return {
    scheme: { en: 'Credit Card' },
    pp: { en: 'PayPal' },
    klarna: { en: 'Klarna' },
    affirm: { en: 'Affirm' },
    gpay: { en: 'Google Pay' },
    ...(config.adyenPaymentMethodsToNames || {}),
  }
}

function loadAndValidateConfig() {
  config = loadConfig()

  const numberOfCtpConfigs = Object.keys(config.commercetools).length
  const numberOfAdyenConfigs = Object.keys(config.adyen).length
  if (numberOfCtpConfigs === 0)
    throw new Error(
      'Please add at least one commercetools project to the config',
    )
  if (numberOfAdyenConfigs === 0)
    throw new Error(
      'Please add at least one Adyen merchant account to the config',
    )

  for (const [ctpProjectKey, ctpConfig] of Object.entries(
    config.commercetools,
  )) {
    if (!ctpConfig.clientId || !ctpConfig.clientSecret)
      throw new Error(
        `[${ctpProjectKey}]: CTP project credentials are missing. ` +
          'Please verify that all projects have projectKey, clientId and clientSecret',
      )
  }

  for (const [adyenMerchantAccount, adyenConfig] of Object.entries(
    config.adyen,
  )) {
    const errorMessage = _validateAuthenticationConfig(adyenConfig)
    if (errorMessage)
      throw new Error(
        `[${adyenMerchantAccount}]: Authentication is not properly configured. ` +
          `Please update the configuration. Error: [${errorMessage}]`,
      )

    const ctpProjectKeyErrorMessage = _validateCtpProjectKeyConfig(
      adyenConfig,
      Object.keys(config.commercetools),
    )
    if (ctpProjectKeyErrorMessage)
      throw new Error(
        `[${adyenMerchantAccount}]: Commercetools project is not properly configured. ` +
          `Please update the configuration. Error: [${ctpProjectKeyErrorMessage}]`,
      )
  }

  const argv = process.argv[3]

  if (argv === 'setupNotificationResources')
    // skip validation of HMAC because this command is setting them up
    // and validation at this point would fail
    return

  for (const [adyenMerchantAccount, adyenConfig] of Object.entries(
    config.adyen,
  )) {
    if (
      adyenConfig.enableHmacSignature !== 'false' &&
      isEmpty(adyenConfig.secretHmacKey)
    )
      throw new Error(
        `[${adyenMerchantAccount}]: The "secretHmacKey" config variable is missing to be able to verify ` +
          `notifications, please generate a secret HMAC key in Adyen Customer Area ` +
          `or set "enableHmacSignature=false" to disable the verification feature.`,
      )
  }
}

loadAndValidateConfig()

// Using default, because the file needs to be exported as object.
export default {
  getModuleConfig,
  getCtpConfig,
  getAdyenConfig,
  getAllCtpProjectKeys,
  getAllAdyenMerchantAccounts,
  getAdyenPaymentMethodsToNames,
}
