const { expect } = require('chai')
const fs = require('fs')
const homedir = require('os').homedir()

describe('::config::', () => {
  it('when config is provided, it should load correctly', () => {
    process.env.ADYEN_INTEGRATION_CONFIG = JSON.stringify({
      commercetools: {
        ctpProjectKey1: {
          clientId: 'clientId',
          clientSecret: 'clientSecret',
          apiUrl: 'host',
          authUrl: 'authUrl',
          authentication: {
            scheme: 'basic',
            username: 'username',
            password: 'password',
          },
        },
      },
      adyen: {
        adyenMerchantAccount1: {
          apiBaseUrl: 'apiBaseUrl',
          apiKey: 'apiKey',
          clientKey: 'clientKey',
          legacyApiBaseUrl: 'legacyApiBaseUrl',
        },
      },
      logLevel: 'DEBUG',
    })
    const config = requireUncached('../../../src/config/config')

    expect(config.getAllCtpProjectKeys()).to.eql(['ctpProjectKey1'])
    expect(config.getAllAdyenMerchantAccounts()).to.eql([
      'adyenMerchantAccount1',
    ])

    expect(config.getCtpConfig('ctpProjectKey1')).to.eql({
      apiUrl: 'host',
      clientId: 'clientId',
      clientSecret: 'clientSecret',
      authUrl: 'authUrl',
      projectKey: 'ctpProjectKey1',
      authentication: {
        scheme: 'basic',
        username: 'username',
        password: 'password',
      },
    })
    expect(config.getAdyenConfig('adyenMerchantAccount1')).to.eql({
      apiBaseUrl: 'apiBaseUrl',
      apiKey: 'apiKey',
      clientKey: 'clientKey',
      legacyApiBaseUrl: 'legacyApiBaseUrl',
    })
  })

  it('when some values are not provided, it should provide default values', () => {
    process.env.ADYEN_INTEGRATION_CONFIG = JSON.stringify({
      commercetools: {
        ctpProjectKey1: {
          clientId: 'clientId',
          clientSecret: 'clientSecret',
        },
      },
      adyen: {
        adyenMerchantAccount1: {
          apiKey: 'apiKey',
          clientKey: 'clientKey',
        },
      },
      logLevel: 'DEBUG',
    })
    const config = requireUncached('../../../src/config/config')

    expect(config.getAllCtpProjectKeys()).to.eql(['ctpProjectKey1'])
    expect(config.getAllAdyenMerchantAccounts()).to.eql([
      'adyenMerchantAccount1',
    ])
    expect(config.getCtpConfig('ctpProjectKey1')).to.eql({
      apiUrl: 'https://api.europe-west1.gcp.commercetools.com',
      authUrl: 'https://auth.europe-west1.gcp.commercetools.com',
      clientId: 'clientId',
      clientSecret: 'clientSecret',
      projectKey: 'ctpProjectKey1',
    })
    expect(config.getAdyenConfig('adyenMerchantAccount1')).to.eql({
      apiBaseUrl: 'https://checkout-test.adyen.com/v68',
      apiKey: 'apiKey',
      clientKey: 'clientKey',
      legacyApiBaseUrl: 'https://pal-test.adyen.com/pal/servlet/Payment/v64',
    })
  })

  it('when whole config is missing, it should throw error', () => {
    delete process.env.ADYEN_INTEGRATION_CONFIG
    try {
      requireUncached('../../../src/config/config')
      expect.fail('This test should throw an error, but it did not')
    } catch (e) {
      expect(e.message).to.contain('configuration is not provided')
    }
  })

  it('when no commercetools project is provided, it should throw error', () => {
    process.env.ADYEN_INTEGRATION_CONFIG = JSON.stringify({
      commercetools: {},
      adyen: {
        adyenMerchantAccount1: {
          apiBaseUrl: 'apiBaseUrl',
          apiKey: 'apiKey',
          clientKey: 'clientKey',
          legacyApiBaseUrl: 'legacyApiBaseUrl',
        },
      },
      logLevel: 'DEBUG',
    })
    try {
      requireUncached('../../../src/config/config')
      expect.fail('This test should throw an error, but it did not')
    } catch (e) {
      expect(e.message).to.contain('add at least one commercetools project')
    }
  })

  it('when no adyen merchant account is provided, it should throw error', () => {
    process.env.ADYEN_INTEGRATION_CONFIG = JSON.stringify({
      commercetools: {
        ctpProjectKey1: {
          clientId: 'clientId',
          clientSecret: 'clientSecret',
          apiUrl: 'host',
          authUrl: 'authUrl',
        },
      },
      adyen: {},
      logLevel: 'DEBUG',
    })
    try {
      requireUncached('../../../src/config/config')
      expect.fail('This test should throw an error, but it did not')
    } catch (e) {
      expect(e.message).to.contain('add at least one Adyen merchant account')
    }
  })

  // Require cache equivalent in es modules
  // https://github.com/nodejs/help/issues/2806
  function requireUncached(module) {
    delete require.cache[require.resolve(module)]
    // eslint-disable-next-line global-require,import/no-dynamic-require
    return require(module)
  }

  it('when basicAuth is true but authetication object is not provided, it should throw error', () => {
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
          apiBaseUrl: 'apiBaseUrl',
          apiKey: 'apiKey',
          clientKey: 'clientKey',
          legacyApiBaseUrl: 'legacyApiBaseUrl',
        },
      },
      logLevel: 'DEBUG',
      basicAuth: true,
    })
    try {
      const config = requireUncached('../../../src/config/config')
      config.getCtpConfig('ctpProjectKey1')
      expect.fail('This test should throw an error, but it did not')
    } catch (e) {
      expect(e.message).to.contain(
        'Authentication is not properly configured. Please update the configuration'
      )
    }
  })

  it('when authetication object is provided by scheme is absent in it, it should throw error', () => {
    process.env.ADYEN_INTEGRATION_CONFIG = JSON.stringify({
      commercetools: {
        ctpProjectKey1: {
          clientId: 'clientId',
          clientSecret: 'clientSecret',
          apiUrl: 'host',
          authUrl: 'authUrl',
          authentication: {
            username: 'username',
            password: 'password',
          },
        },
      },
      adyen: {
        adyenMerchantAccount1: {
          apiBaseUrl: 'apiBaseUrl',
          apiKey: 'apiKey',
          clientKey: 'clientKey',
          legacyApiBaseUrl: 'legacyApiBaseUrl',
        },
      },
      logLevel: 'DEBUG',
    })
    try {
      const config = requireUncached('../../../src/config/config')
      config.getCtpConfig('ctpProjectKey1')
      expect.fail('This test should throw an error, but it did not')
    } catch (e) {
      expect(e.message).to.contain(
        'Authentication is not properly configured. Please update the configuration'
      )
    }
  })

  it('when authetication object is provided by scheme is not valid, it should throw error', () => {
    process.env.ADYEN_INTEGRATION_CONFIG = JSON.stringify({
      commercetools: {
        ctpProjectKey1: {
          clientId: 'clientId',
          clientSecret: 'clientSecret',
          apiUrl: 'host',
          authUrl: 'authUrl',
          authentication: {
            scheme: 'test',
            username: 'username',
            password: 'password',
          },
        },
      },
      adyen: {
        adyenMerchantAccount1: {
          apiBaseUrl: 'apiBaseUrl',
          apiKey: 'apiKey',
          clientKey: 'clientKey',
          legacyApiBaseUrl: 'legacyApiBaseUrl',
        },
      },
      logLevel: 'DEBUG',
    })
    try {
      const config = requireUncached('../../../src/config/config')
      config.getCtpConfig('ctpProjectKey1')
      expect.fail('This test should throw an error, but it did not')
    } catch (e) {
      expect(e.message).to.contain(
        'Authentication is not properly configured. Please update the configuration'
      )
    }
  })

  it(
    'when extra adyenPaymentMethodsToNames config is not provided, ' +
      'it should return default adyenPaymentMethodsToNames config',
    () => {
      process.env.ADYEN_INTEGRATION_CONFIG = JSON.stringify({
        commercetools: {
          ctpProjectKey1: {
            clientId: 'clientId',
            clientSecret: 'clientSecret',
          },
        },
        adyen: {
          adyenMerchantAccount1: {
            apiKey: 'apiKey',
            clientKey: 'clientKey',
          },
        },
        logLevel: 'DEBUG',
      })
      const config = requireUncached('../../../src/config/config')

      expect(config.getAdyenPaymentMethodsToNames()).to.eql({
        scheme: { en: 'Credit Card' },
        pp: { en: 'PayPal' },
        klarna: { en: 'Klarna' },
        gpay: { en: 'Google Pay' },
        affirm: { en: 'Affirm' },
      })
    }
  )

  it(
    'when extra adyenPaymentMethodsToNames config is provided, ' +
      'it should return merged adyenPaymentMethodsToNames config',
    () => {
      process.env.ADYEN_INTEGRATION_CONFIG = JSON.stringify({
        commercetools: {
          ctpProjectKey1: {
            clientId: 'clientId',
            clientSecret: 'clientSecret',
          },
        },
        adyen: {
          adyenMerchantAccount1: {
            apiKey: 'apiKey',
            clientKey: 'clientKey',
          },
        },
        adyenPaymentMethodsToNames: {
          pp: { en: 'Paypal standard' },
          gpay: { en: 'Google pay' },
        },
        logLevel: 'DEBUG',
      })
      const config = requireUncached('../../../src/config/config')

      expect(config.getAdyenPaymentMethodsToNames()).to.eql({
        scheme: { en: 'Credit Card' },
        pp: { en: 'Paypal standard' },
        klarna: { en: 'Klarna' },
        affirm: { en: 'Affirm' },
        gpay: { en: 'Google pay' },
      })
    }
  )

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
            authentication: {
              scheme: 'basic',
              username: 'username',
              password: 'password',
            },
          },
        },
        adyen: {
          adyenMerchantAccount1: {
            apiBaseUrl: 'apiBaseUrl',
            apiKey: 'apiKey',
            clientKey: 'clientKey',
            legacyApiBaseUrl: 'legacyApiBaseUrl',
          },
        },
        logLevel: 'DEBUG',
        removeSensitiveData: false,
      })
      const config = requireUncached('../../../src/config/config')
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
            authentication: {
              scheme: 'basic',
              username: 'username',
              password: 'password',
            },
          },
        },
        adyen: {
          adyenMerchantAccount1: {
            apiBaseUrl: 'apiBaseUrl',
            apiKey: 'apiKey',
            clientKey: 'clientKey',
            legacyApiBaseUrl: 'legacyApiBaseUrl',
          },
        },
        logLevel: 'DEBUG',
        removeSensitiveData: true,
      })
      const config = requireUncached('../../../src/config/config')
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
      const config = requireUncached('../../../src/config/config')
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
      const config = requireUncached('../../../src/config/config')
      expect(config.getModuleConfig().removeSensitiveData).to.eql(true)
    }
  )

  it('when ADYEN_INTEGRATION_CONFIG is not valid JSON, it should throw error', () => {
    process.env.ADYEN_INTEGRATION_CONFIG = '{"a"}'
    try {
      requireUncached('../../../src/config/config')
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
      const filePath = `${homedir}/.extensionrc`
      try {
        delete process.env.ADYEN_INTEGRATION_CONFIG
        const config = {
          commercetools: {
            ctpProjectKey1: {
              clientId: 'clientId',
              clientSecret: 'clientSecret',
              apiUrl: 'host',
              authUrl: 'authUrl',
              authentication: {
                scheme: 'basic',
                username: 'username',
                password: 'password',
              },
            },
          },
          adyen: {
            adyenMerchantAccount1: {
              apiBaseUrl: 'apiBaseUrl',
              apiKey: 'apiKey',
              clientKey: 'clientKey',
              legacyApiBaseUrl: 'legacyApiBaseUrl',
            },
          },
          logLevel: 'DEBUG',
        }
        fs.writeFileSync(filePath, JSON.stringify(config), 'utf-8')

        const loadedConfig = requireUncached('../../../src/config/config')
        expect(loadedConfig.getCtpConfig('ctpProjectKey1')).to.deep.equal({
          clientId: 'clientId',
          clientSecret: 'clientSecret',
          apiUrl: 'host',
          authUrl: 'authUrl',
          projectKey: 'ctpProjectKey1',
          authentication: {
            scheme: 'basic',
            username: 'username',
            password: 'password',
          },
        })
        expect(
          loadedConfig.getAdyenConfig('adyenMerchantAccount1')
        ).to.deep.equal({
          apiBaseUrl: 'apiBaseUrl',
          apiKey: 'apiKey',
          clientKey: 'clientKey',
          legacyApiBaseUrl: 'legacyApiBaseUrl',
        })
      } finally {
        fs.unlinkSync(filePath)
      }
    }
  )
})
