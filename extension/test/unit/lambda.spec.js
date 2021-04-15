const sinon = require('sinon')
const chai = require('chai')
const { handler } = require('../../index.lambda')
const paymentHandler = require('../../src/paymentHandler/payment-handler')

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
    const actions = [{ some: 'action' }]
    sinon
      .stub(paymentHandler, 'handlePayment')
      .returns({ success: true, actions })

    const result = await handler(event)

    expect(result.responseType).equals('UpdateRequest')
    expect(result.actions).equals(actions)
    expect(result.errors).to.equal(undefined)
  })

  it('returns correct failed response', async () => {
    const errors = [{ some: 'error' }]
    sinon
      .stub(paymentHandler, 'handlePayment')
      .returns({ success: false, errors })

    const result = await handler(event)

    expect(result.responseType).equals('FailedValidation')
    expect(result.errors).equals(errors)
    expect(result.actions).to.have.lengthOf(0)
  })

  it('does not throw unhandled exception when handlePayment actions are empty', async () => {
    sinon
      .stub(paymentHandler, 'handlePayment')
      .returns({ success: true, actions: [] })

    const result = await handler(event)

    expect(result.responseType).equals('UpdateRequest')
    expect(result.errors).equals(undefined)
    expect(result.actions).to.be.empty
  })

  it('logs and throws unhandled exceptions', async () => {
    sinon.stub(paymentHandler, 'handlePayment').throws(new Error('some error'))

    // const call = async () => handler(event)
    const result = await handler(event)
    expect(result.responseType).equals('FailedValidation')
    expect(result.errors).to.not.empty
    expect(result.errors).to.have.lengthOf(1)
    expect(result.errors[0].code).to.equal('General')
  })

  it('empty body in event should return errors', async () => {
    const actions = [{ some: 'action' }]
    sinon
      .stub(paymentHandler, 'handlePayment')
      .returns({ success: true, actions })

    const result = await handler({})
    expect(result.responseType).equals('FailedValidation')
    expect(result.errors).to.not.empty
    expect(result.errors).to.have.lengthOf(1)
    expect(result.errors[0].code).to.equal('InvalidInput')
  })
})
