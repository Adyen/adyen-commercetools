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
