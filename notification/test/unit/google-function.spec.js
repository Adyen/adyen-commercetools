const sinon = require('sinon')
const chai = require('chai')
const VError = require('verror')
const { notificationTrigger } = require('../../index.googleFunction')
const notificationHandler = require('../../src/handler/notification/notification.handler')
const logger = require('../../src/utils/logger')
const config = require('../../src/config/config')

const { expect } = chai
const { getNotificationForTracking } = require('../../src/utils/commons')
const {
  buildMockErrorFromConcurrentModificaitonException,
} = require('../test-utils')
chai.use(require('chai-as-promised'))

describe('Google Function handler', () => {
  const sandbox = sinon.createSandbox()

  const mockRequest = {
    body: {
      notificationItems: [
        {
          NotificationRequestItem: {
            additionalData: {
              'metadata.ctProjectKey': 'dummyCtProjectKey',
            },
            merchantAccountCode: 'dummyAydenMerchantCode',
          },
        },
      ],
    },
    url: '',
  }

  const mockResponse = {
    responseStatus: 200,
    responseBody: {},
    status(value) {
      this.responseStatus = value
      return this
    },
    send(value) {
      this.responseBody = value
      return this
    },
  }
  beforeEach(() => {
    const configGetCtpConfigSpy = sandbox
      .stub(config, 'getCtpConfig')
      .callsFake(() => ({}))
    config.getCtpConfig = configGetCtpConfigSpy
    module.exports = config

    const configGetAdyenConfigSpy = sandbox
      .stub(config, 'getAdyenConfig')
      .callsFake(() => ({}))
    config.getAdyenConfig = configGetAdyenConfigSpy
    module.exports = config
  })
  afterEach(() => {
    notificationHandler.processNotification.restore()

    sandbox.restore()
  })

  it('returns correct success response', async () => {
    sinon.stub(notificationHandler, 'processNotification').returns(undefined)

    const result = await notificationTrigger(mockRequest, mockResponse)
    expect(result.responseStatus).to.eql(200)
    expect(result.responseBody).to.eql({ notificationResponse: '[accepted]' })
  })

  it('throws and logs for concurrent modification exceptions', async () => {
    const originalChildFn = logger.getLogger().child
    try {
      const logSpy = sinon.spy()
      logger.getLogger().error = logSpy
      logger.getLogger().child = () => ({
        error: logSpy,
      })

      const error = buildMockErrorFromConcurrentModificaitonException()
      const errorWrapper = new VError(error)
      sinon
        .stub(notificationHandler, 'processNotification')
        .throws(errorWrapper)

      const result = await notificationTrigger(mockRequest, mockResponse)
      expect(result.responseStatus).to.equal(500)
      expect(result.responseBody).to.equal(
        'Object 62f05181-4789-47ce-84f8-d27c895ee23c has a different version than expected. Expected: 1 - Actual: 2.'
      )

      const notificationItem = mockRequest.body.notificationItems.pop()
      logSpy.calledWith(
        {
          notification: getNotificationForTracking(notificationItem),
          err: errorWrapper,
        },
        'Unexpected exception occurred.'
      )
    } finally {
      logger.getLogger().child = originalChildFn
    }
  })

  it('logs for unrecoverable and returns "accepted"', async () => {
    const originalChildFn = logger.getLogger().child
    try {
      const logSpy = sinon.spy()
      logger.getLogger().error = logSpy
      logger.getLogger().child = () => ({
        error: logSpy,
      })

      const error = new Error('some error')
      sinon.stub(notificationHandler, 'processNotification').throws(error)

      const result = await notificationTrigger(mockRequest, mockResponse)
      expect(result.responseStatus).to.eql(200)
      expect(result.responseBody).to.eql({ notificationResponse: '[accepted]' })

      const notificationItem = mockRequest.body.notificationItems.pop()
      logSpy.calledWith(
        {
          notification: getNotificationForTracking(notificationItem),
          err: error,
        },
        'Unexpected exception occurred.'
      )
    } finally {
      logger.getLogger().child = originalChildFn
    }
  })
})
