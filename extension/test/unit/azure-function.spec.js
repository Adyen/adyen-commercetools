import sinon from 'sinon'
import { expect } from 'chai'
import { azureExtensionTrigger } from '../../extension-trigger/index.azureFunction.js'
import paymentHandler from '../../src/paymentHandler/payment-handler.js'

let sandbox = null

describe('Azure function app', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const context = {}

  const mockRequest = {
    body: {
      resource: { obj: {} },
    },
    url: '',
  }

  it('if accessing azure function with correct payment, it should return 200 http status', async () => {
    const actions = [{ some: 'action' }]
    sandbox.stub(paymentHandler, 'handlePayment').returns({ actions })

    await azureExtensionTrigger(context, mockRequest)
    expect(context.res.status).to.be.equal(200)
    expect(context.res.responseType).to.be.equal('UpdateRequest')
    expect(context.res.body.actions).to.deep.equal([{ some: 'action' }])
  })

  it('if accessing azure function without payload, it should return 400 http status', async () => {
    await azureExtensionTrigger(context, {})

    expect(context.res.responseType).equals('FailedValidation')
    expect(context.res.status).to.be.equal(400)
    expect(context.res.body.errors).to.deep.equal([
      {
        code: 'InvalidInput',
        message: 'Invalid request body.',
      },
    ])
  })

  it('if unexpected error is thrown from payment handling, it should return 400 http status', async () => {
    sandbox.stub(paymentHandler, 'handlePayment').throws()

    await azureExtensionTrigger(context, mockRequest)

    expect(context.res.status).to.be.equal(400)
    expect(context.res.responseType).to.be.equal('FailedValidation')
    expect(context.res.body.errors).to.not.empty
    expect(context.res.body.errors).to.have.lengthOf(1)
    expect(context.res.body.errors[0].code).to.equal('General')
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

    await azureExtensionTrigger(context, mockRequest)

    expect(context.res.status).to.equal(400)
    expect(context.res.body).to.not.empty
    expect(context.res.body.errors).to.have.lengthOf(1)
    expect(context.res.body.errors).to.deep.equal(errors)
  })
})
