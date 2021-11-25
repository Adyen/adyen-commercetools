const { expect } = require('chai')
const fs = require('fs')
const homedir = require('os').homedir()

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

  it('when ADYEN_INTEGRATION_CONFIG is not valid JSON, it should throw error', () => {
    process.env.ADYEN_INTEGRATION_CONFIG = '{"a"}'
    try {
      requireUncached('../../src/config/config')
      expect.fail('This test should throw an error, but it did not')
    } catch (e) {
      expect(e.message).to.contain(
        'configuration is not provided in the JSON format'
      )
    }
  })

  it(
    'when ADYEN_INTEGRATION_CONFIG is not set but external file is configured, ' +
      'then it should load configuration correctly',
    () => {
      const filePath = `${homedir}/.notificationrc`
      try {
        delete process.env.ADYEN_INTEGRATION_CONFIG
        const config = {
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
        }
        fs.writeFileSync(filePath, JSON.stringify(config), 'utf-8')

        const loadedConfig = requireUncached('../../src/config/config')
        expect(loadedConfig.getCtpConfig('ctpProjectKey1')).to.deep.equal({
          clientId: 'clientId',
          clientSecret: 'clientSecret',
          apiUrl: 'host',
          authUrl: 'authUrl',
          projectKey: 'ctpProjectKey1',
        })
        expect(
          loadedConfig.getAdyenConfig('adyenMerchantAccount1')
        ).to.deep.equal({
          enableHmacSignature: false,
          secretHmacKey: undefined,
        })
      } finally {
        fs.unlinkSync(filePath)
      }
    }
  )
})
