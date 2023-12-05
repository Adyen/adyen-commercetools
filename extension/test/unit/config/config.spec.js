import { expect } from 'chai'
import fs from 'fs'
import { randomUUID } from 'crypto'
import os from 'os'
import { fileURLToPath } from 'url'
import path from 'path'

const homedir = os.homedir()

describe('::config::', () => {
  const extensionConfigFileName = '.eslintrc'
  const tempFileName = '.extensionrctemp'

  it('when config is provided, it should load correctly', async () => {
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
    const config = await reloadModule('../../../src/config/config.js')

    expect(config.default.getAllCtpProjectKeys()).to.eql(['ctpProjectKey1'])
    expect(config.default.getAllAdyenMerchantAccounts()).to.eql([
      'adyenMerchantAccount1',
    ])

    expect(config.default.getCtpConfig('ctpProjectKey1')).to.eql({
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
    expect(config.default.getAdyenConfig('adyenMerchantAccount1')).to.eql({
      apiBaseUrl: 'apiBaseUrl',
      apiKey: 'apiKey',
      clientKey: 'clientKey',
      paypalMerchantId: '',
    })
  })

  it('when some values are not provided, it should provide default values', async () => {
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
    const config = await reloadModule('../../../src/config/config.js')

    expect(config.default.getAllCtpProjectKeys()).to.eql(['ctpProjectKey1'])
    expect(config.default.getAllAdyenMerchantAccounts()).to.eql([
      'adyenMerchantAccount1',
    ])
    expect(config.default.getCtpConfig('ctpProjectKey1')).to.eql({
      apiUrl: 'https://api.europe-west1.gcp.commercetools.com',
      authUrl: 'https://auth.europe-west1.gcp.commercetools.com',
      clientId: 'clientId',
      clientSecret: 'clientSecret',
      projectKey: 'ctpProjectKey1',
    })
    expect(config.default.getAdyenConfig('adyenMerchantAccount1')).to.eql({
      apiBaseUrl: 'https://checkout-test.adyen.com/v71',
      apiKey: 'apiKey',
      clientKey: 'clientKey',
      paypalMerchantId: '',
    })
  })

  it('when both config and external config file are missing, it should throw error', async () => {
    delete process.env.ADYEN_INTEGRATION_CONFIG
    renameExtensionrcFile(extensionConfigFileName, tempFileName)
    try {
      await reloadModule('../../../src/config/config.js')
      expect.fail('This test should throw an error, but it did not')
    } catch (e) {
      expect(e.message).to.contain('configuration is not provided')
    } finally {
      renameExtensionrcFile(tempFileName, extensionConfigFileName)
    }
  })

  it('when no commercetools project is provided, it should throw error', async () => {
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
      await reloadModule('../../../src/config/config.js')
      expect.fail('This test should throw an error, but it did not')
    } catch (e) {
      expect(e.message).to.contain('add at least one commercetools project')
    }
  })

  it('when no adyen merchant account is provided, it should throw error', async () => {
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
      await reloadModule('../../../src/config/config.js')
      expect.fail('This test should throw an error, but it did not')
    } catch (e) {
      expect(e.message).to.contain('add at least one Adyen merchant account')
    }
  })

  async function reloadModule(module) {
    return import(`${module}?testName=${randomUUID()}`)
  }

  it('when basicAuth is true but authentication object is not provided, it should throw error', async () => {
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
      const config = await reloadModule('../../../src/config/config.js')
      config.default.getCtpConfig('ctpProjectKey1')
      expect.fail('This test should throw an error, but it did not')
    } catch (e) {
      expect(e.message).to.contain(
        'Authentication is not properly configured. Please update the configuration',
      )
    }
  })

  it('when authentication object is provided by scheme is absent in it, it should throw error', async () => {
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
      const config = await reloadModule('../../../src/config/config.js')
      config.default.getCtpConfig('ctpProjectKey1')
      expect.fail('This test should throw an error, but it did not')
    } catch (e) {
      expect(e.message).to.contain(
        'Authentication is not properly configured. Please update the configuration',
      )
    }
  })

  it('when authetication object is provided by scheme is not valid, it should throw error', async () => {
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
      const config = await reloadModule('../../../src/config/config.js')
      config.default.getCtpConfig('ctpProjectKey1')
      expect.fail('This test should throw an error, but it did not')
    } catch (e) {
      expect(e.message).to.contain(
        'Authentication is not properly configured. Please update the configuration',
      )
    }
  })

  it(
    'when extra adyenPaymentMethodsToNames config is not provided, ' +
      'it should return default adyenPaymentMethodsToNames config',
    async () => {
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
      const config = await reloadModule('../../../src/config/config.js')

      expect(config.default.getAdyenPaymentMethodsToNames()).to.eql({
        scheme: { en: 'Credit Card' },
        pp: { en: 'PayPal' },
        klarna: { en: 'Klarna' },
        gpay: { en: 'Google Pay' },
        affirm: { en: 'Affirm' },
      })
    },
  )

  it(
    'when extra adyenPaymentMethodsToNames config is provided, ' +
      'it should return merged adyenPaymentMethodsToNames config',
    async () => {
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
      const config = await reloadModule('../../../src/config/config.js')

      expect(config.default.getAdyenPaymentMethodsToNames()).to.eql({
        scheme: { en: 'Credit Card' },
        pp: { en: 'Paypal standard' },
        klarna: { en: 'Klarna' },
        affirm: { en: 'Affirm' },
        gpay: { en: 'Google pay' },
      })
    },
  )

  describe('removeSentitiveData', () => {
    it(
      'when removeSensitiveData is set as boolean false in config.js, ' +
        'it should load as false value in module config',
      async () => {
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
        const config = await reloadModule('../../../src/config/config.js')
        expect(config.default.getModuleConfig().removeSensitiveData).to.eql(
          false,
        )
      },
    )

    it(
      'when removeSensitiveData is set as boolean true in config.js, ' +
        'it should load as true value in module config',
      async () => {
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
        const config = await reloadModule('../../../src/config/config.js')
        expect(config.default.getModuleConfig().removeSensitiveData).to.eql(
          true,
        )
      },
    )

    it(
      'when removeSensitiveData is set as string false in config.js, ' +
        'it should load as false value in module config',
      async () => {
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
        const config = await reloadModule('../../../src/config/config.js')
        expect(config.default.getModuleConfig().removeSensitiveData).to.eql(
          false,
        )
      },
    )

    it(
      'when removeSensitiveData is set as string true in config.js, ' +
        'it should load as true value in module config',
      async () => {
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
        const config = await reloadModule('../../../src/config/config.js')
        expect(config.default.getModuleConfig().removeSensitiveData).to.eql(
          true,
        )
      },
    )
  })

  describe('addCommercetoolsLineItems', () => {
    it(
      'when addCommercetoolsLineItems is set as boolean false in config.js, ' +
        'it should load as false value in module config',
      async () => {
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
          addCommercetoolsLineItems: false,
        })
        const config = await reloadModule('../../../src/config/config.js')
        expect(
          config.default.getModuleConfig().addCommercetoolsLineItems,
        ).to.eql(false)
      },
    )

    it(
      'when addCommercetoolsLineItems is set as boolean true in config.js, ' +
        'it should load as true value in module config',
      async () => {
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
          addCommercetoolsLineItems: true,
        })
        const config = await reloadModule('../../../src/config/config.js')
        expect(
          config.default.getModuleConfig().addCommercetoolsLineItems,
        ).to.eql(true)
      },
    )

    it(
      'when addCommercetoolsLineItems is set as string false in config.js, ' +
        'it should load as false value in module config',
      async () => {
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
          addCommercetoolsLineItems: 'false',
        })
        const config = await reloadModule('../../../src/config/config.js')
        expect(
          config.default.getModuleConfig().addCommercetoolsLineItems,
        ).to.eql(false)
      },
    )

    it(
      'when addCommercetoolsLineItems is set as string true in config.js, ' +
        'it should load as true value in module config',
      async () => {
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
          addCommercetoolsLineItems: 'true',
        })
        const config = await reloadModule('../../../src/config/config.js')
        expect(
          config.default.getModuleConfig().addCommercetoolsLineItems,
        ).to.eql(true)
      },
    )
  })

  describe('generateIdempotencyKey', () => {
    it(
      'when generateIdempotencyKey is set as boolean false in config.js, ' +
        'it should load as false value in module config',
      async () => {
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
          generateIdempotencyKey: false,
        })
        const config = await reloadModule('../../../src/config/config.js')
        expect(config.default.getModuleConfig().generateIdempotencyKey).to.eql(
          false,
        )
      },
    )

    it(
      'when generateIdempotencyKey is set as boolean true in config.js, ' +
        'it should load as true value in module config',
      async () => {
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
          generateIdempotencyKey: true,
        })
        const config = await reloadModule('../../../src/config/config.js')
        expect(config.default.getModuleConfig().generateIdempotencyKey).to.eql(
          true,
        )
      },
    )

    it(
      'when generateIdempotencyKey is set as string false in config.js, ' +
        'it should load as false value in module config',
      async () => {
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
          generateIdempotencyKey: 'false',
        })
        const config = await reloadModule('../../../src/config/config.js')
        expect(config.default.getModuleConfig().generateIdempotencyKey).to.eql(
          false,
        )
      },
    )

    it(
      'when generateIdempotencyKey is set as string true in config.js, ' +
        'it should load as true value in module config',
      async () => {
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
          generateIdempotencyKey: 'true',
        })
        const config = await reloadModule('../../../src/config/config.js')
        expect(config.default.getModuleConfig().generateIdempotencyKey).to.eql(
          true,
        )
      },
    )
  })

  it('when ADYEN_INTEGRATION_CONFIG is not valid JSON, it should throw error', async () => {
    process.env.ADYEN_INTEGRATION_CONFIG = '{"a"}'
    try {
      await reloadModule('../../../src/config/config.js')
      expect.fail('This test should throw an error, but it did not')
    } catch (e) {
      expect(e.message).to.contain(
        'configuration is not provided in the JSON format',
      )
    }
  })

  it(
    'when ADYEN_INTEGRATION_CONFIG is not set but external file is configured, ' +
      'then it should load configuration correctly',
    async () => {
      renameExtensionrcFile(extensionConfigFileName, tempFileName)
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

        const loadedConfig = await reloadModule('../../../src/config/config.js')
        expect(
          loadedConfig.default.getCtpConfig('ctpProjectKey1'),
        ).to.deep.equal({
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
          loadedConfig.default.getAdyenConfig('adyenMerchantAccount1'),
        ).to.deep.equal({
          apiBaseUrl: 'apiBaseUrl',
          apiKey: 'apiKey',
          clientKey: 'clientKey',
          paypalMerchantId: '',
        })
      } finally {
        fs.unlinkSync(filePath)
        renameExtensionrcFile(tempFileName, extensionConfigFileName)
      }
    },
  )

  function renameExtensionrcFile(fileName, fileNameToRename) {
    const currentFilePath = fileURLToPath(import.meta.url)
    const currentDirPath = path.dirname(currentFilePath)
    const projectRoot = path.resolve(currentDirPath, '../../../')
    const pathToFile = path.resolve(projectRoot, fileName)
    const tempPathToFileRename = path.resolve(projectRoot, fileNameToRename)

    // Rename file if it exists
    fs.stat(pathToFile, (err) => {
      // ignore error
      if (!err) {
        fs.renameSync(pathToFile, tempPathToFileRename)
      }
    })
  }
})
