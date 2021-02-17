const sinon = require('sinon')
const chai = require('chai')
const { handler } = require('../../index.lambda')
const notificationHandler = require('../../src/handler/notification/notification.handler')
const logger = require('../../src/utils/logger')

const { expect, assert } = chai
const { getNotificationForTracking } = require('../../src/utils/commons')

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
            'metadata.commercetoolsProjectKey': 'adyen-integration-test',
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

  it('logs unhandled exceptions', async () => {
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

  it('throws error if no notificationItems were received and logs properly', async () => {
    const logSpy = sinon.spy()
    sinon.stub(notificationHandler, 'processNotification').returns(undefined)
    logger.getLogger().error = logSpy

    const error = new Error('No notification received.')

    const emptyEvent = {}
    const call = async () => handler(emptyEvent)

    await expect(call()).to.be.rejectedWith(error.message)
    assert(
      logSpy.calledWith(
        sinon.match({
          notification: undefined,
          err: sinon.match
            .instanceOf(Error)
            .and(sinon.match.has('message', error.message)),
        }),
        `Unexpected error when processing event`
      )
    )
  })
})
