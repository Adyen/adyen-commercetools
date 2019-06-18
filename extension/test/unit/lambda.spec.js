const sinon = require('sinon')
const chai = require('chai')
const { handler } = require('../../src/lambda')
const paymentHandler = require('../../src/paymentHandler/payment-handler')
const setup = require('../../src/config/init/ensure-resources')
const utils = require('../../src/utils')

const { expect, assert } = chai

chai.use(require('chai-as-promised'))

describe('Lambda handler', () => {
  let ensureResourcesStub

  beforeEach(() => {
    ensureResourcesStub = sinon.stub(setup, 'ensureResources').returns(true)
  })
  afterEach(() => {
    setup.ensureResources.restore()
    paymentHandler.handlePayment.restore()
  })

  const event = {
    resource :
      { obj : {} }
  }

  it('only calls ensureResources once', async () => {
    sinon.stub(paymentHandler, 'handlePayment').returns({ success: true, data: {}})

    await handler(event)
    await handler(event)

    expect(ensureResourcesStub.calledOnce).to.equal(true)
  })

  it('returns correct success response', async () => {
    const actions = [ { some: "action" }]
    sinon.stub(paymentHandler, 'handlePayment').returns({ success: true, data: { actions: actions}})

    const result = await handler(event)

    expect(result.responseType).equals(`UpdateRequest`)
    expect(result.actions).equals(actions)
  })

  it('returns correct failed response', async () => {
    const errors = [ { some: "error" }]
    sinon.stub(paymentHandler, 'handlePayment').returns({ success: false, data: { errors: errors}})

    const result = await handler(event)

    expect(result.responseType).equals(`FailedValidation`)
    expect(result.errors).equals(errors)
  })

  it('logs and throws unhandled exceptions', async () => {
    const logSpy = sinon.spy()
    utils.getLogger().error = logSpy

    const error = new Error('some error')
    sinon.stub(paymentHandler, 'handlePayment').throws(error)

    const call = async () => handler(event)

    await expect(call()).to.be.rejectedWith(error)
    assert(logSpy.calledWith(error, `Unexpected error when processing event ${JSON.stringify(event)}`))
  })
})