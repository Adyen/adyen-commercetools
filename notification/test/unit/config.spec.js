const { expect } = require('chai')

describe('::config::', () => {
  it('when hmac is enabled but no hmac key, it should throw an error', () => {
    process.env.ADYEN_INTEGRATION_CONFIG = JSON.stringify({
      commercetools: {
        ctpProjectKey1: {
          clientId: 'clientId',
          clientSecret: 'clientSecret',
          apiUrl: 'host',
          authUrl: 'authUrl',
        },
      },
      adyen: {
        adyenMerchantAccount1: {
          enableHmacSignature: 'true',
        },
      },
      logLevel: 'DEBUG',
    })
    try {
      requireUncached('../../src/config/config')
      expect.fail('This test should throw an error, but it did not')
    } catch (e) {
      expect(e.message).to.contain(
        'The "secretHmacKey" config variable is missing to be able to verify notifications'
      )
    }
  })

  function requireUncached(module) {
    delete require.cache[require.resolve(module)]
    // eslint-disable-next-line global-require,import/no-dynamic-require
    return require(module)
  }

  it(
    'when removeSensitiveData is set as boolean false in config.js, ' +
      'it should load as false value in module config',
    () => {
      process.env.ADYEN_INTEGRATION_CONFIG = JSON.stringify({
        commercetools: {
          ctpProjectKey1: {
            clientId: 'clientId',
            clientSecret: 'clientSecret',
            apiUrl: 'host',
            authUrl: 'authUrl',
          },
        },
        adyen: {
          adyenMerchantAccount1: {
            enableHmacSignature: 'false',
          },
        },
        logLevel: 'DEBUG',
        removeSensitiveData: false,
      })
      const config = requireUncached('../../src/config/config')
      expect(config.getModuleConfig().removeSensitiveData).to.eql(false)
    }
  )

  it(
    'when removeSensitiveData is set as boolean true in config.js, ' +
      'it should load as true value in module config',
    () => {
      process.env.ADYEN_INTEGRATION_CONFIG = JSON.stringify({
        commercetools: {
          ctpProjectKey1: {
            clientId: 'clientId',
            clientSecret: 'clientSecret',
            apiUrl: 'host',
            authUrl: 'authUrl',
          },
        },
        adyen: {
          adyenMerchantAccount1: {
            enableHmacSignature: 'false',
          },
        },
        logLevel: 'DEBUG',
        removeSensitiveData: true,
      })
      const config = requireUncached('../../src/config/config')
      expect(config.getModuleConfig().removeSensitiveData).to.eql(true)
    }
  )

  it(
    'when removeSensitiveData is set as string false in config.js, ' +
      'it should load as false value in module config',
    () => {
      process.env.ADYEN_INTEGRATION_CONFIG = JSON.stringify({
        commercetools: {
          ctpProjectKey1: {
            clientId: 'clientId',
            clientSecret: 'clientSecret',
            apiUrl: 'host',
            authUrl: 'authUrl',
          },
        },
        adyen: {
          adyenMerchantAccount1: {
            enableHmacSignature: 'false',
          },
        },
        logLevel: 'DEBUG',
        removeSensitiveData: 'false',
      })
      const config = requireUncached('../../src/config/config')
      expect(config.getModuleConfig().removeSensitiveData).to.eql(false)
    }
  )

  it(
    'when removeSensitiveData is set as string true in config.js, ' +
      'it should load as true value in module config',
    () => {
      process.env.ADYEN_INTEGRATION_CONFIG = JSON.stringify({
        commercetools: {
          ctpProjectKey1: {
            clientId: 'clientId',
            clientSecret: 'clientSecret',
            apiUrl: 'host',
            authUrl: 'authUrl',
          },
        },
        adyen: {
          adyenMerchantAccount1: {
            enableHmacSignature: 'false',
          },
        },
        logLevel: 'DEBUG',
        removeSensitiveData: 'true',
      })
      const config = requireUncached('../../src/config/config')
      expect(config.getModuleConfig().removeSensitiveData).to.eql(true)
    }
  )
})
