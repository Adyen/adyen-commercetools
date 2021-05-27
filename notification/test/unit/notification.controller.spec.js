const _ = require('lodash')
const sinon = require('sinon')
const { expect } = require('chai')

const config = require('../../src/config/config')
const notificationController = require('../../src/api/notification/notification.controller.js')
const httpUtils = require('../../src/utils/commons')
const logger = require('../../src/utils/logger')

const sandbox = sinon.createSandbox()
describe('notification controller', () => {
  const mockNotificationJson = {
    live: 'false',
    notificationItems: [
      {
        NotificationRequestItem: {
          amount: {
            currency: 'EUR',
            value: 10100,
          },
          additionalData: {
            key: 'value',
            key2: 'value2',
          },
          eventCode: 'AUTHORISATION',
          eventDate: '2019-01-30T18:16:22+01:00',
          merchantAccountCode: 'CommercetoolsGmbHDE775',
          merchantReference: '8313842560770001',
          operations: ['CANCEL', 'CAPTURE', 'REFUND'],
          paymentMethod: 'visa',
          pspReference: 'test_AUTHORISATION_1',
          success: 'true',
        },
      },
    ],
  }

  let originalCollectRequestDataFn
  let originalLogErrorFn
  let logSpy

  before(() => {
    originalCollectRequestDataFn = httpUtils.collectRequestData
    originalLogErrorFn = logger.getLogger().error
  })

  afterEach(() => {
    httpUtils.collectRequestData = originalCollectRequestDataFn
    logger.getLogger().error = originalLogErrorFn
    module.exports = httpUtils
    sandbox.restore()
  })

  it(
    'when request does not contain ctProjectKey, ' +
      'it should log error and return "accepted" status',
    async () => {
      // prepare:
      const requestMock = {
        method: 'POST',
      }
      const responseMock = {
        writeHead: () => {},
        end: () => {},
      }
      const responseWriteHeadSpy = sandbox.spy(responseMock, 'writeHead')
      const responseEndSpy = sandbox.spy(responseMock, 'end')
      const notificationJson = _.cloneDeep(mockNotificationJson)
      httpUtils.collectRequestData = () => JSON.stringify(notificationJson)
      module.exports = httpUtils

      logSpy = sinon.spy()
      logger.getLogger().error = logSpy

      // test:
      await notificationController.handleNotification(requestMock, responseMock)

      // expect:
      expect(responseWriteHeadSpy.firstCall.firstArg).to.equal(200)
      expect(logSpy.calledOnce).to.be.true
      expect(responseEndSpy.firstCall.firstArg).to.equal(
        JSON.stringify({ notificationResponse: '[accepted]' })
      )
      expect(logSpy.firstCall.args[0].err.message).to.equal(
        'Notification can not be processed as "metadata.ctProjectKey"  was not found on the notification.'
      )
    }
  )

  it('when adyenMerchantAccount is not configured, it should log error and return "accepted" status', async () => {
    // prepare:
    const requestMock = {
      method: 'POST',
    }
    const responseMock = {
      writeHead: () => {},
      end: () => {},
    }
    const responseWriteHeadSpy = sandbox.spy(responseMock, 'writeHead')
    const responseEndSpy = sandbox.spy(responseMock, 'end')

    const notificationJson = _.cloneDeep(mockNotificationJson)
    notificationJson.notificationItems[0].NotificationRequestItem.additionalData =
      {
        'metadata.ctProjectKey': 'testKey',
      }
    notificationJson.notificationItems[0].NotificationRequestItem.merchantAccountCode =
      'nonExistingMerchantAccount'
    httpUtils.collectRequestData = () => JSON.stringify(notificationJson)
    module.exports = httpUtils

    const configGetCtpConfigSpy = sandbox
      .stub(config, 'getCtpConfig')
      .callsFake(() => ({}))
    config.getCtpConfig = configGetCtpConfigSpy
    module.exports = config

    logSpy = sinon.spy()
    logger.getLogger().error = logSpy

    // test:
    await notificationController.handleNotification(requestMock, responseMock)

    // expect:
    expect(responseWriteHeadSpy.firstCall.firstArg).to.equal(200)
    expect(logSpy.calledOnce).to.be.true
    expect(responseEndSpy.firstCall.firstArg).to.equal(
      JSON.stringify({ notificationResponse: '[accepted]' })
    )
    expect(logSpy.firstCall.args[0].err.message).to.equal(
      // eslint-disable-next-line max-len
      'Configuration for adyenMerchantAccount is not provided. Please update the configuration: "nonExistingMerchantAccount"'
    )
  })

  it('when commercetools project is not configured, it should log error and return "accepted" status', async () => {
    // prepare:
    const requestMock = {
      method: 'POST',
    }
    const responseMock = {
      writeHead: () => {},
      end: () => {},
    }
    const responseWriteHeadSpy = sandbox.spy(responseMock, 'writeHead')
    const responseEndSpy = sandbox.spy(responseMock, 'end')
    const notificationJson = _.cloneDeep(mockNotificationJson)
    notificationJson.notificationItems[0].NotificationRequestItem.additionalData =
      {
        'metadata.ctProjectKey': 'nonExistingCtpProjectKey',
      }
    httpUtils.collectRequestData = () => JSON.stringify(notificationJson)
    module.exports = httpUtils

    logSpy = sinon.spy()
    logger.getLogger().error = logSpy

    // test:
    await notificationController.handleNotification(requestMock, responseMock)

    // expect:
    expect(responseWriteHeadSpy.firstCall.firstArg).to.equal(200)
    expect(logSpy.calledOnce).to.be.true
    expect(responseEndSpy.firstCall.firstArg).to.equal(
      JSON.stringify({ notificationResponse: '[accepted]' })
    )
    expect(logSpy.firstCall.args[0].err.message).to.equal(
      'Configuration is not provided. Please update the configuration. ctpProjectKey: ["nonExistingCtpProjectKey"]'
    )
  })
})
