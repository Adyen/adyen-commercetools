const sinon = require('sinon')
const chai = require('chai')
const VError = require('verror')
const { handler } = require('../../index.lambda')
const notificationHandler = require('../../src/handler/notification/notification.handler')
const logger = require('../../src/utils/logger')

const { expect } = chai
const { getNotificationForTracking } = require('../../src/utils/commons')
const {
  buildMockErrorFromConcurrentModificaitonException,
} = require('../test-utils')
chai.use(require('chai-as-promised'))

describe('Lambda handler', () => {
  afterEach(() => {
    notificationHandler.processNotification.restore()
  })

  const event = {
    notificationItems: [
      {
        NotificationRequestItem: {
          additionalData: {
            'metadata.ctProjectKey': 'adyen-integration-test',
          },
          merchantAccountCode: 'CommercetoolsGmbHDE775',
        },
      },
    ],
  }

  it('returns correct success response', async () => {
    sinon.stub(notificationHandler, 'processNotification').returns(undefined)

    const result = await handler(event)

    expect(result).to.eql({ notificationResponse: '[accepted]' })
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

      const call = async () => handler(event)
      await expect(call()).to.be.rejectedWith(errorWrapper)

      const notificationItem = event.notificationItems.pop()
      logSpy.calledWith(
        {
          notification: getNotificationForTracking(notificationItem),
          err: errorWrapper,
        },
        'Unexpected error when processing event'
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

      const result = await handler(event)
      expect(result).to.eql({ notificationResponse: '[accepted]' })

      const notificationItem = event.notificationItems.pop()
      logSpy.calledWith(
        {
          notification: getNotificationForTracking(notificationItem),
          err: error,
        },
        'Unexpected error when processing event'
      )
    } finally {
      logger.getLogger().child = originalChildFn
    }
  })
})
