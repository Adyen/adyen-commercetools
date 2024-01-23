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
        })
      } finally {
        fs.unlinkSync(filePath)
        renameNotificationrcFile(tempFileName, notificationConfigFileName)
        process.env.ADYEN_INTEGRATION_CONFIG = originalAdyenConfig
      }
    },
  )

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
