const { expect } = require('chai')

describe('::config::', () => {
  it('when hmac is enabled but no hmac key, it should throw an error', () => {
    process.env.ADYEN_INTEGRATION_CONFIG = JSON.stringify({
      commercetools: {
        ctpProjectKey1: {
          clientId: 'clientId',
          clientSecret: 'clientSecret',
          ensureResources: true,
          apiUrl: 'host',
          authUrl: 'authUrl',
        },
      },
      adyen: {
        adyenMerchantAccount1: {
          enableHmacSignature: 'true'
        }
      },
      logLevel: 'DEBUG',
    })
    try {
      requireUncached('../../src/config/config')
      expect.fail('This test should throw an error, but it did not')
    } catch (e) {
      expect(e.message).to.contain('The "secretHmacKey" config variable is missing to be able to verify notifications')
    }
  })

  function requireUncached(module) {
    delete require.cache[require.resolve(module)]
    // eslint-disable-next-line global-require,import/no-dynamic-require
    return require(module)
  }
})
