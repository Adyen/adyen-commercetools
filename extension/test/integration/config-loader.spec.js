const fs = require('fs')

describe('::config-loader::', () => {

  it('when ADYEN_INTEGRATION_CONFIG is not set but external file is configured, ' +
    'then it should load configuration correctly', () => {
    const homedir = require('os').homedir();
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
      fs.writeFileSync(
        filePath,
        JSON.stringify(config),
        'utf-8'
      )

      requireUncached('../../src/config/config')
    } catch (e) {
      throw e;
    } finally {
      fs.unlinkSync(filePath);
    }
  })

  function requireUncached(module) {
    delete require.cache[require.resolve(module)]
    // eslint-disable-next-line global-require,import/no-dynamic-require
    return require(module)
  }

})
