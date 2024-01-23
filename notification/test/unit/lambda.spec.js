import sinon from 'sinon'
import chai from 'chai'
import VError from 'verror'
import chaiAsPromised from 'chai-as-promised'
import { handler } from '../../index.lambda.js'
import notificationHandler from '../../src/handler/notification/notification.handler.js'
import { getLogger } from '../../src/utils/logger.js'
import config from '../../src/config/config.js'
import utils from '../../src/utils/commons.js'
import { buildMockErrorFromConcurrentModificationException } from '../test-utils.js'

const logger = getLogger()
const { expect, assert } = chai
chai.use(chaiAsPromised)

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

    const result = await handler(event)

    expect(result).to.eql({ notificationResponse: '[accepted]' })
  })

  it('throws and logs for concurrent modification exceptions', async () => {
    const originalChildFn = logger.child
    try {
      const logSpy = sinon.spy()
      logger.error = logSpy
      logger.child = () => ({
        error: logSpy,
      })

      const error = await buildMockErrorFromConcurrentModificationException()
      const errorWrapper = new VError(error)
      sinon
        .stub(notificationHandler, 'processNotification')
        .throws(errorWrapper)

      const call = async () => handler(event)
      await expect(call()).to.be.rejectedWith(errorWrapper)

      const notificationItem = event.notificationItems.pop()
      logSpy.calledWith(
        {
          notification: utils.getNotificationForTracking(notificationItem),
          err: errorWrapper,
        },
        'Unexpected error when processing event',
      )
    } finally {
      logger.child = originalChildFn
    }
  })

  it('logs for unrecoverable and returns "accepted"', async () => {
    const originalChildFn = logger.child
    try {
      const logSpy = sinon.spy()
      logger.error = logSpy
      logger.child = () => ({
        error: logSpy,
      })

      const error = new Error('some error')
      sinon.stub(notificationHandler, 'processNotification').throws(error)

      const result = await handler(event)
      expect(result).to.eql({ notificationResponse: '[accepted]' })

      const notificationItem = event.notificationItems.pop()
      logSpy.calledWith(
        {
          notification: utils.getNotificationForTracking(notificationItem),
          err: error,
        },
        'Unexpected error when processing event',
      )
    } finally {
      logger.child = originalChildFn
    }
  })

  it('throws error if no notificationItems were received and logs properly', async () => {
    const logSpy = sinon.spy()
    sinon.stub(notificationHandler, 'processNotification').returns(undefined)
    logger.error = logSpy

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
        `Unexpected error when processing event`,
      ),
    )
  })
})
