const _ = require('lodash')
const sinon = require('sinon')
const { cloneDeep } = require('lodash')
const { expect } = require('chai')

const config = require('../../src/config/config')
const notificationController = require('../../src/api/notification/notification.controller')
const httpUtils = require('../../src/utils/commons')
const logger = require('../../src/utils/logger')
const notification = require('../resources/notification.json')
const ctpClientMock = require('./ctp-client-mock')
const concurrentModificationError = require('../resources/concurrent-modification-exception.json')
const ctp = require('../../src/utils/ctp')
const paymentMock = require('../resources/payment-credit-card.json')

const sandbox = sinon.createSandbox()
describe('notification controller', () => {
  const commercetoolsProjectKey = config.getAllCtpProjectKeys()[0]
  const ctpConfig = config.getCtpConfig(commercetoolsProjectKey)
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

  it(
    'when concurrent modification exception occur during fetching from CTP and retry fails, ' +
      'it should return 500 HTTP response and log error',
    async () => {
      // prepare:
      const requestMock = {
        method: 'POST',
      }
      const responseMock = {
        writeHead: () => {},
        end: () => {},
      }
      const ctpClient = ctpClientMock.get(ctpConfig)
      const modifiedPaymentMock = cloneDeep(paymentMock)
      sandbox.stub(ctpClient, 'fetchByKey').callsFake(() => ({
        body: modifiedPaymentMock,
      }))
      sandbox.stub(ctpClient, 'fetchById').callsFake(() => ({
        body: modifiedPaymentMock,
      }))
      sandbox.stub(ctpClient, 'update').callsFake(() => {
        throw _buildMockErrorFromConcurrentModificaitonException()
      })
      ctp.get = () => ctpClient
      module.exports = ctp

      const responseWriteHeadSpy = sandbox.spy(responseMock, 'writeHead')
      const responseEndSpy = sandbox.spy(responseMock, 'end')
      const notificationJson = notification
      httpUtils.collectRequestData = () => JSON.stringify(notificationJson)
      module.exports = httpUtils

      logSpy = sinon.spy()
      logger.getLogger().error = logSpy

      // test:
      await notificationController.handleNotification(requestMock, responseMock)

      // expect:
      expect(logSpy.calledOnce).to.be.true
      expect(logSpy.firstCall.args[0].err.cause().message).to.equal(
        'Object 62f05181-4789-47ce-84f8-d27c895ee23c has a different version than expected. Expected: 1 - Actual: 2.'
      )
      expect(responseWriteHeadSpy.firstCall.firstArg).to.equal(500)
      expect(responseEndSpy.firstCall.firstArg).to.equal(undefined)
    }
  )
})

function _buildMockErrorFromConcurrentModificaitonException() {
  const error = new Error(concurrentModificationError.message)
  error.body = concurrentModificationError.body
  error.name = concurrentModificationError.name
  error.code = concurrentModificationError.code
  error.status = concurrentModificationError.status
  error.statusCode = concurrentModificationError.statusCode
  error.originalRequest = concurrentModificationError.originalRequest
  error.retryCount = concurrentModificationError.retryCount
  error.headers = concurrentModificationError.headers
  return error
}
