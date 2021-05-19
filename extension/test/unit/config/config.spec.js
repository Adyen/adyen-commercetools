const { expect } = require('chai')

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
      apiBaseUrl: 'https://checkout-test.adyen.com/v67',
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
    'when extra paymentMethodsToNames config is not provided, ' +
      'it should return default paymentMethodsToNames config',
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

      expect(config.getPaymentMethodsToNamesConfig()).to.eql({
        scheme: 'Credit Card',
        pp: 'PayPal',
        klarna: 'Klarna',
      })
    }
  )

  it(
    'when extra paymentMethodsToNames config is provided, ' +
      'it should return merged paymentMethodsToNames config',
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
        paymentMethodsToNames: {
          pp: 'Paypal standard',
          gpay: 'Google pay',
        },
        logLevel: 'DEBUG',
      })
      const config = requireUncached('../../../src/config/config')

      expect(config.getPaymentMethodsToNamesConfig()).to.eql({
        scheme: 'Credit Card',
        pp: 'Paypal standard',
        klarna: 'Klarna',
        gpay: 'Google pay',
      })
    }
  )
})
