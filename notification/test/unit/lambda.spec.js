const sinon = require('sinon')
const chai = require('chai')
const { handler } = require('../../src/lambda')
const notificationHandler = require('../../src/handler/notification/notification.handler')
const setup = require('../../src/config/init/ensure-interface-interaction-custom-type')
const logger = require('../../src/utils/logger')

const { expect, assert } = chai

chai.use(require('chai-as-promised'))

describe('Lambda handler', () => {
  let ensureResourcesStub

  beforeEach(() => {
    ensureResourcesStub = sinon
      .stub(setup, 'ensureInterfaceInteractionCustomType')
      .returns(undefined)
  })

  afterEach(() => {
    setup.ensureInterfaceInteractionCustomType.restore()
    notificationHandler.processNotifications.restore()
  })

  const event = {
    notificationItems: [],
  }

  it('only calls ensureResources once', async () => {
    sinon.stub(notificationHandler, 'processNotifications').returns(undefined)

    await handler(event)
    await handler(event)

    expect(ensureResourcesStub.calledOnce).to.equal(true)
  })

  it('returns correct success response', async () => {
    sinon.stub(notificationHandler, 'processNotifications').returns(undefined)

    const result = await handler(event)

    expect(result).to.eql({ notificationResponse: '[accepted]' })
  })

  it('logs and throws unhandled exceptions', async () => {
    const logSpy = sinon.spy()
    logger.getLogger().error = logSpy

    const error = new Error('some error')
    sinon.stub(notificationHandler, 'processNotifications').throws(error)

    const call = async () => handler(event)

    await expect(call()).to.be.rejectedWith(error)
    assert(
      logSpy.calledWith(
        error,
        `Unexpected error when processing event ${JSON.stringify(event)}`
      )
    )
  })
})
