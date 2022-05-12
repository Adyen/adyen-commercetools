import sinon from 'sinon'
import { expect } from 'chai'
import { extensionTrigger } from '../../index.googleFunction.js'
import paymentHandler from '../../src/paymentHandler/payment-handler.js'

let sandbox = null

describe('Google cloud function', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const mockRequest = {
    body: {
      resource: { obj: {} },
    },
    url: '',
  }

  const mockResponse = {
    responseStatus: 200,
    responseBody: {},
    status(value) {
      this.responseStatus = value
      return this
    },
    send(value) {
      this.responseBody = value
      return this
    },
  }

  it('if accessing cloud function with correct payment, it should return 200 http status', async () => {
    const actions = [{ some: 'action' }]
    sandbox.stub(paymentHandler, 'handlePayment').returns({ actions })

    const result = await extensionTrigger(mockRequest, mockResponse)
    expect(result.responseStatus).to.be.equal(200)
    expect(result.responseBody).to.deep.equal({
      actions: [{ some: 'action' }],
    })
  })

  it('if accessing cloud function without payload, it should return 400 http status', async () => {
    const result = await extensionTrigger({}, mockResponse)

    expect(result.responseStatus).to.be.equal(400)
    expect(result.responseBody).to.deep.equal({
      errors: [
        {
          code: 'InvalidInput',
          message: 'Invalid body payload.',
        },
      ],
    })
  })

  it('if unexpected error is thrown from payment handling, it should return 400 http status', async () => {
    sandbox.stub(paymentHandler, 'handlePayment').throws()

    const result = await extensionTrigger(mockRequest, mockResponse)
    expect(result.responseStatus).to.equal(400)
    expect(result.responseBody.errors).to.not.empty
    expect(result.responseBody.errors).to.have.lengthOf(1)
    expect(result.responseBody.errors[0].code).to.equal('General')
  })

  it('if result is fail after payment handling, it should return 400 http status', async () => {
    const errors = [
      {
        code: 'InvalidField',
        message:
          'Required field "commercetoolsProjectKey" is missing or empty.',
      },
    ]

    sandbox.stub(paymentHandler, 'handlePayment').returns({ errors })

    const result = await extensionTrigger(mockRequest, mockResponse)

    expect(result.responseStatus).to.equal(400)
    expect(result.responseBody.errors).to.not.empty
    expect(result.responseBody.errors).to.have.lengthOf(1)
    expect(result.responseBody.errors).to.deep.equal(errors)
  })
})
