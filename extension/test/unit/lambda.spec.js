import sinon from 'sinon'
import { expect } from 'chai'
import { handler } from '../../index.lambda.js'
import paymentHandler from '../../src/paymentHandler/payment-handler.js'

describe('Lambda handler', () => {
  afterEach(() => {
    paymentHandler.handlePayment.restore()
  })

  const event = {
    resource: { obj: {} },
  }

  function parseResponse(result) {
    expect(result.statusCode).to.equal(200)
    expect(result.isBase64Encoded).to.equal(false)
    expect(result.headers).to.deep.equal({
      'Content-Type': 'application/json',
    })
    return JSON.parse(result.body)
  }

  it('returns correct success response', async () => {
    const actions = [{ some: 'action' }]
    sinon.stub(paymentHandler, 'handlePayment').returns({ actions })

    const body = parseResponse(await handler(event))

    expect(body.responseType).equals('UpdateRequest')
    expect(body.actions).to.deep.equal(actions)
    expect(body).to.not.have.property('errors')
  })

  it('returns correct failed response', async () => {
    const errors = [{ some: 'error' }]
    sinon.stub(paymentHandler, 'handlePayment').returns({ errors })

    const body = parseResponse(await handler(event))

    expect(body.responseType).equals('FailedValidation')
    expect(body.errors).to.deep.equal(errors)
    expect(body.actions).to.have.lengthOf(0)
  })

  it('does not throw unhandled exception when handlePayment actions are empty', async () => {
    sinon.stub(paymentHandler, 'handlePayment').returns({ actions: [] })

    const body = parseResponse(await handler(event))

    expect(body.responseType).equals('UpdateRequest')
    expect(body).to.not.have.property('errors')
    expect(body.actions).to.be.empty
  })

  it('logs and throws unhandled exceptions', async () => {
    sinon.stub(paymentHandler, 'handlePayment').throws(new Error('some error'))

    const body = parseResponse(await handler(event))

    expect(body.responseType).equals('FailedValidation')
    expect(body.errors).to.not.empty
    expect(body.errors).to.have.lengthOf(1)
    expect(body.errors[0].code).to.equal('General')
  })

  it('empty body in event should return errors', async () => {
    const actions = [{ some: 'action' }]
    sinon.stub(paymentHandler, 'handlePayment').returns({ actions })

    const body = parseResponse(await handler({}))

    expect(body.responseType).equals('FailedValidation')
    expect(body.errors).to.not.empty
    expect(body.errors).to.have.lengthOf(1)
    expect(body.errors[0].code).to.equal('InvalidInput')
  })

  it('handles an ALB/API Gateway event with a stringified body', async () => {
    const actions = [{ some: 'action' }]
    sinon.stub(paymentHandler, 'handlePayment').returns({ actions })

    const body = parseResponse(
      await handler({
        body: JSON.stringify(event),
        headers: { authorization: 'Basic dXNlcm5hbWU6cGFzc3dvcmQ=' },
      }),
    )

    expect(body.responseType).equals('UpdateRequest')
    expect(body.actions).to.deep.equal(actions)
    expect(paymentHandler.handlePayment.firstCall.args[1]).to.equal(
      'Basic dXNlcm5hbWU6cGFzc3dvcmQ=',
    )
  })
})
