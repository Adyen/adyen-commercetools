const sinon = require('sinon')
const chai = require('chai')
const { handler } = require('../../index.lambda')
const paymentHandler = require('../../src/paymentHandler/payment-handler')
const utils = require('../../src/utils')

const { expect } = chai

chai.use(require('chai-as-promised'))

describe('Lambda handler', () => {
  afterEach(() => {
    paymentHandler.handlePayment.restore()
  })

  const event = {
    resource: { obj: {} },
  }

  it('returns correct success response', async () => {
    sinon
      .stub(paymentHandler, 'handlePayment')
      .returns({ success: true, actions: [{ some: 'action' }] })

    const result = await handler(event)
    expect(result.responseType).equals('UpdateRequest')
    expect(result.actions).to.deep.equal([{ some: 'action' }])
    expect(result.errors).to.equal(undefined)
  })

  it('returns correct failed response', async () => {
    sinon
      .stub(paymentHandler, 'handlePayment')
      .returns({ success: false, errors: [{ some: 'error' }] })

    const result = await handler(event)
    console.log('0000')
    console.log(result)
    expect(result.responseType).equals('FailedValidation')
    expect(result.errors).to.deep.equal([{ some: 'error' }])
    expect(result.actions).to.equal(undefined)
  })

  it('does not throw unhandled exception when handlePayment data is null', async () => {
    sinon
      .stub(paymentHandler, 'handlePayment')
      .returns({ success: true, actions: [] })

    const result = await handler(event)
    console.log('0001')
    console.log(result)
    expect(result.responseType).equals('UpdateRequest')
    expect(result.errors).to.equal(undefined)
    expect(result.actions).to.be.empty
  })

  it('logs and throws unhandled exceptions', async () => {
    const logSpy = sinon.spy()
    utils.getLogger().error = logSpy

    const error = new Error('some error')
    sinon.stub(paymentHandler, 'handlePayment').throws(error)

    const call = async () => handler(event)

    await expect(call()).to.be.rejectedWith(error)
    logSpy.calledWith(
      error,
      `Unexpected error when processing event ${JSON.stringify(error)}`
    )
  })
})
