import sinon from 'sinon'
import { expect } from 'chai'
import VError from 'verror'
import { notificationTrigger } from '../../index.googleFunction.js'
import notificationHandler from '../../src/handler/notification/notification.handler.js'
import { getLogger } from '../../src/utils/logger.js'
import config from '../../src/config/config.js'
import utils from '../../src/utils/commons.js'
import { buildMockErrorFromConcurrentModificationException } from '../test-utils.js'

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

    const configGetAdyenConfigSpy = sandbox
      .stub(config, 'getAdyenConfig')
      .callsFake(() => ({}))
    config.getAdyenConfig = configGetAdyenConfigSpy
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
    const originalChildFn = getLogger().child
    try {
      const logSpy = sinon.spy()
      getLogger().error = logSpy
      getLogger().child = () => ({
        error: logSpy,
      })

      const error = await buildMockErrorFromConcurrentModificationException()
      const errorWrapper = new VError(error)
      sinon
        .stub(notificationHandler, 'processNotification')
        .throws(errorWrapper)

      const result = await notificationTrigger(mockRequest, mockResponse)
      expect(result.responseStatus).to.equal(500)
      expect(result.responseBody).to.equal(
        'Object 62f05181-4789-47ce-84f8-d27c895ee23c has a different version than expected. Expected: 1 - Actual: 2.',
      )

      const notificationItem = mockRequest.body.notificationItems.pop()
      logSpy.calledWith(
        {
          notification: utils.getNotificationForTracking(notificationItem),
          err: errorWrapper,
        },
        'Unexpected exception occurred.',
      )
    } finally {
      getLogger().child = originalChildFn
    }
  })

  it('logs for unrecoverable and returns "accepted"', async () => {
    const originalChildFn = getLogger().child
    try {
      const logSpy = sinon.spy()
      getLogger().error = logSpy
      getLogger().child = () => ({
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
          notification: utils.getNotificationForTracking(notificationItem),
          err: error,
        },
        'Unexpected exception occurred.',
      )
    } finally {
      getLogger().child = originalChildFn
    }
  })
  it('returns 401 and does not accept the notification when basic authentication fails', async () => {
    const unauthorizedError = new Error('Basic authentication failed')
    unauthorizedError.statusCode = 401
    const processNotificationStub = sinon
      .stub(notificationHandler, 'processNotification')
      .rejects(unauthorizedError)
    const originalErrorFn = getLogger().error
    getLogger().error = sinon.spy()

    const headersToSet = {}
    // earlier tests drain mockRequest.body.notificationItems with pop(), so build a fresh request
    const request = {
      url: '',
      body: {
        notificationItems: [
          {
            NotificationRequestItem: {
              additionalData: {
                'metadata.ctProjectKey': 'dummyCtProjectKey',
              },
              eventCode: 'PENDING',
              merchantAccountCode: 'dummyAydenMerchantCode',
            },
          },
        ],
      },
      headers: { authorization: 'Basic d3Jvbmc6Y3JlZGVudGlhbHM=' },
    }
    const response = {
      ...mockResponse,
      set(name, value) {
        headersToSet[name] = value
        return this
      },
    }

    try {
      const result = await notificationTrigger(request, response)

      sinon.assert.calledWithMatch(processNotificationStub, {
        authorizationHeader: 'Basic d3Jvbmc6Y3JlZGVudGlhbHM=',
      })
      expect(result.responseStatus).to.equal(401)
      expect(result.responseBody).to.equal('Basic authentication failed')
      expect(headersToSet['WWW-Authenticate']).to.equal(
        'Basic realm="adyen-notification"',
      )
    } finally {
      getLogger().error = originalErrorFn
    }
  })
})
