const sinon = require('sinon')
const chai = require('chai')
const VError = require('verror')
const { handler } = require('../../index.lambda')
const notificationHandler = require('../../src/handler/notification/notification.handler')
const logger = require('../../src/utils/logger')
const config = require('../../src/config/config')

const { expect, assert } = chai
const { getNotificationForTracking } = require('../../src/utils/commons')
const {
  buildMockErrorFromConcurrentModificaitonException,
} = require('../test-utils')
chai.use(require('chai-as-promised'))

describe('Lambda handler', () => {
  const sandbox = sinon.createSandbox()
  const event = {
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
            'metadata.ctProjectKey': 'testKey',
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
