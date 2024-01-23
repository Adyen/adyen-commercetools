import sinon from 'sinon'
import lodash from 'lodash'
import { expect } from 'chai'
import config from '../../src/config/config.js'
import { handleNotification } from '../../src/api/notification/notification.controller.js'
import utils from '../../src/utils/commons.js'
import { getLogger } from '../../src/utils/logger.js'
import ctpClientMock from './ctp-client-mock.js'
import ctp from '../../src/utils/ctp.js'
import { buildMockErrorFromConcurrentModificationException } from '../test-utils.js'

const { cloneDeep } = lodash
const logger = getLogger()
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
          merchantAccountCode: 'YOUR_MERCHANT_ACCOUNT',
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
    originalCollectRequestDataFn = utils.collectRequestData
    originalLogErrorFn = logger.error
  })

  afterEach(() => {
    utils.collectRequestData = originalCollectRequestDataFn
    logger.error = originalLogErrorFn
    sandbox.restore()
  })

  it(
    'when request does not contain ctProjectKey, ' +
      'it should log error and return "accepted" status',
    async () => {
      // prepare:
      const requestMock = {
        method: 'POST',
        url: '/',
      }
      const responseMock = {
        writeHead: () => {},
        end: () => {},
      }
      const responseWriteHeadSpy = sandbox.spy(responseMock, 'writeHead')
      const responseEndSpy = sandbox.spy(responseMock, 'end')
      const notificationJson = cloneDeep(mockNotificationJson)
      utils.collectRequestData = () => JSON.stringify(notificationJson)

      logSpy = sinon.spy()
      logger.error = logSpy

      // test:
      await handleNotification(requestMock, responseMock)
      const { cause } = logSpy.firstCall.args[0]
      // expect:
      expect(responseWriteHeadSpy.firstCall.firstArg).to.equal(200)
      expect(logSpy.calledOnce).to.be.true
      expect(responseEndSpy.firstCall.firstArg).to.equal(
        JSON.stringify({ notificationResponse: '[accepted]' }),
      )
      expect(cause.message).to.equal(
        'Notification can not be processed as "metadata.ctProjectKey" was not found on the notification ' +
          'nor the path is containing the commercetools project key.',
      )
    },
  )

  it('when adyenMerchantAccount is not configured, it should log error and return "accepted" status', async () => {
    // prepare:
    const requestMock = {
      method: 'POST',
      url: '/',
    }
    const responseMock = {
      writeHead: () => {},
      end: () => {},
    }
    const responseWriteHeadSpy = sandbox.spy(responseMock, 'writeHead')
    const responseEndSpy = sandbox.spy(responseMock, 'end')

    const notificationJson = cloneDeep(mockNotificationJson)
    notificationJson.notificationItems[0].NotificationRequestItem.additionalData =
      {
        'metadata.ctProjectKey': 'testKey',
      }
    notificationJson.notificationItems[0].NotificationRequestItem.merchantAccountCode =
      'nonExistingMerchantAccount'
    utils.collectRequestData = () => JSON.stringify(notificationJson)

    const configGetCtpConfigSpy = sandbox
      .stub(config, 'getCtpConfig')
      .callsFake(() => ({}))
    config.getCtpConfig = configGetCtpConfigSpy

    logSpy = sinon.spy()
    logger.error = logSpy

    // test:
    await handleNotification(requestMock, responseMock)
    const { cause } = logSpy.firstCall.args[0]
    // expect:
    expect(responseWriteHeadSpy.firstCall.firstArg).to.equal(200)
    expect(logSpy.calledOnce).to.be.true
    expect(responseEndSpy.firstCall.firstArg).to.equal(
      JSON.stringify({ notificationResponse: '[accepted]' }),
    )
    expect(cause.message).to.equal(
      // eslint-disable-next-line max-len
      'Configuration for adyenMerchantAccount is not provided. Please update the configuration: "nonExistingMerchantAccount"',
    )
  })

  it('when commercetools project is not configured, it should log error and return "accepted" status', async () => {
    // prepare:
    const requestMock = {
      method: 'POST',
      url: '/',
    }
    const responseMock = {
      writeHead: () => {},
      end: () => {},
    }
    const responseWriteHeadSpy = sandbox.spy(responseMock, 'writeHead')
    const responseEndSpy = sandbox.spy(responseMock, 'end')
    const notificationJson = cloneDeep(mockNotificationJson)
    notificationJson.notificationItems[0].NotificationRequestItem.additionalData =
      {
        'metadata.ctProjectKey': 'nonExistingCtpProjectKey',
      }
    utils.collectRequestData = () => JSON.stringify(notificationJson)

    logSpy = sinon.spy()
    logger.error = logSpy

    // test:
    await handleNotification(requestMock, responseMock)

    const { cause } = logSpy.firstCall.args[0]
    // expect:
    expect(responseWriteHeadSpy.firstCall.firstArg).to.equal(200)
    expect(logSpy.calledOnce).to.be.true
    expect(responseEndSpy.firstCall.firstArg).to.equal(
      JSON.stringify({ notificationResponse: '[accepted]' }),
    )

    expect(cause.message).to.equal(
      'Configuration is not provided. Please update the configuration. ctpProjectKey: ["nonExistingCtpProjectKey"]',
    )
  })

  it(
    'when concurrent modification exception occur during fetching from CTP and retry fails, ' +
      'it should return 500 HTTP response and log error',
    async () => {
      // prepare:
      const paymentMock = await utils.readAndParseJsonFile(
        'test/resources/payment-credit-card.json',
      )
      const requestMock = {
        method: 'POST',
        url: '/',
      }
      const responseMock = {
        writeHead: () => {},
        end: () => {},
      }
      const ctpClient = ctpClientMock.get(ctpConfig)
      const modifiedPaymentMock = cloneDeep(paymentMock)
      sandbox.stub(ctpClient, 'fetchByKeys').callsFake(() => ({
        body: { results: [modifiedPaymentMock] },
      }))
      sandbox.stub(ctpClient, 'fetchById').callsFake(() => ({
        body: modifiedPaymentMock,
      }))
      sandbox.stub(ctpClient, 'update').callsFake(async () => {
        throw await buildMockErrorFromConcurrentModificationException()
      })
      ctp.get = () => ctpClient

      const responseWriteHeadSpy = sandbox.spy(responseMock, 'writeHead')
      const responseEndSpy = sandbox.spy(responseMock, 'end')
      const notificationJson = mockNotificationJson
      utils.collectRequestData = () => JSON.stringify(notificationJson)

      logSpy = sinon.spy()
      logger.error = logSpy

      notificationJson.notificationItems[0].NotificationRequestItem.additionalData =
        {
          'metadata.ctProjectKey': 'testKey',
        }

      const configGetCtpConfigSpy = sandbox
        .stub(config, 'getCtpConfig')
        .callsFake(() => ({}))
      config.getCtpConfig = configGetCtpConfigSpy

      const configGetAdyenConfigSpy = sandbox
        .stub(config, 'getAdyenConfig')
        .callsFake(() => ({}))
      config.getAdyenConfig = configGetAdyenConfigSpy

      // test:
      await handleNotification(requestMock, responseMock)
      const { cause } = logSpy.firstCall.args[0]

      expect(logSpy.calledOnce).to.be.true
      expect(cause.body.message).to.equal(
        'Object 62f05181-4789-47ce-84f8-d27c895ee23c has a different version than expected. Expected: 1 - Actual: 2.',
      )
      expect(responseWriteHeadSpy.firstCall.firstArg).to.equal(500)
      expect(responseEndSpy.firstCall.firstArg).to.equal(undefined)
    },
  )
})
