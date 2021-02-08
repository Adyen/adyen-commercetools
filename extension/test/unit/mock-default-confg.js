process.env.ADYEN_INTEGRATION_CONFIG = JSON.stringify({
  commercetools: {
    ctpProjectKey1: {
      clientId: 'clientId',
      clientSecret: 'clientSecret',
      ensureResources: true,
    },
    ctpProjectKey2: {
      clientId: 'clientId2',
      clientSecret: 'clientSecret2',
      ensureResources: true,
    },
    ctpProjectKey3: {
      clientId: 'clientId3',
      clientSecret: 'clientSecret3',
      ensureResources: true,
    },
  },
  adyen: {
    adyenMerchantAccount1: {
      apiKey: 'apiKey',
      clientKey: 'clientKey',
    },
    adyenMerchantAccount2: {
      apiKey: 'apiKey2',
      clientKey: 'clientKey2',
    },
    adyenMerchantAccount3: {
      apiKey: 'apiKey3',
      clientKey: 'clientKey3',
    },
  },
  logLevel: 'DEBUG',
  apiExtensionBaseUrl: 'apiExtensionBaseUrl',
})
