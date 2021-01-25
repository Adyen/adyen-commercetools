const sinon = require('sinon')
const chai = require('chai')
const { handler } = require('../../src/lambda')
const paymentHandler = require('../../src/paymentHandler/payment-handler')
const utils = require('../../src/utils')

const { expect, assert } = chai

chai.use(require('chai-as-promised'))

describe('Lambda handler', () => {
  afterEach(() => {
    paymentHandler.handlePayment.restore()
  })

  const event = {
    resource: { obj: {} },
  }

  it('returns correct success response', async () => {
    const actions = [{ some: 'action' }]
    sinon
      .stub(paymentHandler, 'handlePayment')
      .returns({ success: true, data: { actions } })

    const result = await handler(event)

    expect(result.responseType).equals('UpdateRequest')
    expect(result.actions).equals(actions)
    expect(result.errors).to.equal(undefined)
  })

  it('returns correct failed response', async () => {
    const errors = [{ some: 'error' }]
    sinon
      .stub(paymentHandler, 'handlePayment')
      .returns({ success: false, data: { errors } })

    const result = await handler(event)

    expect(result.responseType).equals('FailedValidation')
    expect(result.errors).equals(errors)
    expect(result.actions).to.equal(undefined)
  })

  it('does not throw unhandled exception when handlePayment data is null', async () => {
    sinon
      .stub(paymentHandler, 'handlePayment')
      .returns({ success: true, data: null })

    const result = await handler(event)

    expect(result.responseType).equals('UpdateRequest')
    expect(result.errors).equals(undefined)
    expect(result.actions).to.be.empty
  })

  it('logs and throws unhandled exceptions', async () => {
    const logSpy = sinon.spy()
    utils.getLogger().error = logSpy

    const error = new Error('some error')
    sinon.stub(paymentHandler, 'handlePayment').throws(error)

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
