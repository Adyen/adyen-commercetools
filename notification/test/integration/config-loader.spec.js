const fs = require('fs')
const homedir = require('os').homedir()

describe('::config-loader::', () => {
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

        requireUncached('../../src/config/config')
      } finally {
        fs.unlinkSync(filePath)
      }
    }
  )

  function requireUncached(module) {
    delete require.cache[require.resolve(module)]
    // eslint-disable-next-line global-require,import/no-dynamic-require
    return require(module)
  }
})
