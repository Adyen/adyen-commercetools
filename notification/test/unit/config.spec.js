import { expect } from 'chai'
import fs from 'fs'
import os from 'os'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import path from 'path'

const homedir = os.homedir()

describe('::config::', () => {
  it('when hmac is enabled but no hmac key, it should throw an error', async () => {
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
      await reloadModule('../../src/config/config.js')
      expect.fail('This test should throw an error, but it did not')
    } catch (e) {
      expect(e.message).to.contain(
        'The "secretHmacKey" config variable is missing to be able to verify notifications',
      )
    }
  })

  async function reloadModule(module) {
    return import(`${module}?testName=${randomUUID()}`)
  }

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
      const config = await reloadModule('../../src/config/config.js')
      expect(config.default.getModuleConfig().removeSensitiveData).to.eql(false)
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
      const config = await reloadModule('../../src/config/config.js')
      expect(config.default.getModuleConfig().removeSensitiveData).to.eql(true)
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
      const config = await reloadModule('../../src/config/config.js')
      expect(config.default.getModuleConfig().removeSensitiveData).to.eql(false)
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
      const config = await reloadModule('../../src/config/config.js')
      expect(config.default.getModuleConfig().removeSensitiveData).to.eql(true)
    },
  )

  it('when ADYEN_INTEGRATION_CONFIG is not valid JSON, it should throw error', async () => {
    const originalAdyenConfig = process.env.ADYEN_INTEGRATION_CONFIG
    process.env.ADYEN_INTEGRATION_CONFIG = '{"a"}'
    try {
      await reloadModule('../../src/config/config.js')
      expect.fail('This test should throw an error, but it did not')
    } catch (e) {
      expect(e.message).to.contain(
        'configuration is not provided in the JSON format',
      )
    } finally {
      process.env.ADYEN_INTEGRATION_CONFIG = originalAdyenConfig
    }
  })

  it(
    'when ADYEN_INTEGRATION_CONFIG is not set but external file is configured, ' +
      'then it should load configuration correctly',
    async () => {
      const originalAdyenConfig = process.env.ADYEN_INTEGRATION_CONFIG
      const notificationConfigFileName = '.notificationrc'
      const tempFileName = '.notificationrctemp'

      renameNotificationrcFile(notificationConfigFileName, tempFileName)
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

        const loadedConfig = await reloadModule('../../src/config/config.js')
        expect(
          loadedConfig.default.getCtpConfig('ctpProjectKey1'),
        ).to.deep.equal({
          clientId: 'clientId',
          clientSecret: 'clientSecret',
          apiUrl: 'host',
          authUrl: 'authUrl',
          projectKey: 'ctpProjectKey1',
        })
        expect(
          loadedConfig.default.getAdyenConfig('adyenMerchantAccount1'),
        ).to.deep.equal({
          enableHmacSignature: false,
          secretHmacKey: undefined,
          notificationBaseUrl: undefined,
          apiKey: undefined,
          enableBasicAuth: false,
        })
      } finally {
        fs.unlinkSync(filePath)
        renameNotificationrcFile(tempFileName, notificationConfigFileName)
        process.env.ADYEN_INTEGRATION_CONFIG = originalAdyenConfig
      }
    },
  )

  describe('basic authentication (generic pending webhook)', () => {
    function buildConfig(adyenMerchantConfig) {
      return JSON.stringify({
        commercetools: {
          ctpProjectKey1: {
            clientId: 'clientId',
            clientSecret: 'clientSecret',
          },
        },
        adyen: {
          adyenMerchantAccount1: {
            enableHmacSignature: 'false',
            ...adyenMerchantConfig,
          },
        },
        logLevel: 'DEBUG',
      })
    }

    async function expectConfigToThrow(adyenMerchantConfig, expectedMessage) {
      process.env.ADYEN_INTEGRATION_CONFIG = buildConfig(adyenMerchantConfig)
      try {
        await reloadModule('../../src/config/config.js')
        expect.fail('This test should throw an error, but it did not')
      } catch (e) {
        expect(e.message).to.contain('[adyenMerchantAccount1]')
        expect(e.message).to.contain(expectedMessage)
      }
    }

    it('when enableBasicAuth is true but authentication is missing, it should throw an error', async () => {
      await expectConfigToThrow(
        { enableBasicAuth: true },
        'Basic authentication is enabled but the "authentication" setting is missing',
      )
    })

    it('when enableBasicAuth is true but authentication is incomplete, it should throw an error', async () => {
      await expectConfigToThrow(
        {
          enableBasicAuth: 'true',
          authentication: { scheme: 'basic', username: 'user' },
        },
        'Attributes (scheme, username or password) is missing in "authentication" setting',
      )
    })

    it('when authentication scheme is not basic, it should throw an error', async () => {
      await expectConfigToThrow(
        {
          enableBasicAuth: true,
          authentication: {
            scheme: 'bearer',
            username: 'user',
            password: 'pass',
          },
        },
        'Attributes (scheme, username or password) is missing in "authentication" setting',
      )
    })

    it('when enableBasicAuth is false but authentication object is incomplete, it should throw an error', async () => {
      await expectConfigToThrow(
        {
          enableBasicAuth: false,
          authentication: { scheme: 'basic', username: 'user' },
        },
        'Attributes (scheme, username or password) is missing in "authentication" setting',
      )
    })

    it('when enableBasicAuth is true but ctpProjectKey is missing, it should throw an error', async () => {
      await expectConfigToThrow(
        {
          enableBasicAuth: true,
          authentication: {
            scheme: 'basic',
            username: 'user',
            password: 'pass',
          },
        },
        'Basic authentication is enabled but the "ctpProjectKey" setting is missing',
      )
    })

    it('when ctpProjectKey does not match a configured commercetools project, it should throw an error', async () => {
      await expectConfigToThrow(
        { ctpProjectKey: 'unknownProjectKey' },
        'The "ctpProjectKey" setting [unknownProjectKey] does not match any commercetools project',
      )
    })

    it('when basic auth is properly configured, it should expose authentication and ctpProjectKey', async () => {
      process.env.ADYEN_INTEGRATION_CONFIG = buildConfig({
        enableBasicAuth: 'true',
        ctpProjectKey: 'ctpProjectKey1',
        authentication: {
          scheme: 'Basic',
          username: 'user',
          password: 'pass',
        },
      })
      const config = await reloadModule('../../src/config/config.js')
      const adyenConfig = config.default.getAdyenConfig('adyenMerchantAccount1')
      expect(adyenConfig.enableBasicAuth).to.equal(true)
      expect(adyenConfig.ctpProjectKey).to.equal('ctpProjectKey1')
      expect(adyenConfig.authentication).to.deep.equal({
        scheme: 'Basic',
        username: 'user',
        password: 'pass',
      })
    })

    it('when enableBasicAuth is not set, it should default to false without optional attributes', async () => {
      process.env.ADYEN_INTEGRATION_CONFIG = buildConfig({})
      const config = await reloadModule('../../src/config/config.js')
      const adyenConfig = config.default.getAdyenConfig('adyenMerchantAccount1')
      expect(adyenConfig.enableBasicAuth).to.equal(false)
      expect(adyenConfig).to.not.have.property('authentication')
      expect(adyenConfig).to.not.have.property('ctpProjectKey')
    })
  })

  function renameNotificationrcFile(fileName, fileNameToRename) {
    const currentFilePath = fileURLToPath(import.meta.url)
    const currentDirPath = path.dirname(currentFilePath)
    const projectRoot = path.resolve(currentDirPath, '../../')
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
