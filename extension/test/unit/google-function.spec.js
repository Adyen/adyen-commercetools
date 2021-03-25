const sinon = require('sinon')
const proxyquire = require('proxyquire')
const { expect } = require('chai')

const utilsStub = {}
const googleFunction = proxyquire('../../index.googleFunction', {
  './src/utils': utilsStub,
})
const paymentHandler = require('../../src/paymentHandler/payment-handler')

let sandbox = null

describe('Google cloud function', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('if accessing cloud function with correct payment, it should return 200 http status', async () => {
    const actions = [{ some: 'action' }]
    const mockRequest = {
      body: {
        resource: { obj: {} },
      },
    }

    sandbox
      .stub(paymentHandler, 'handlePayment')
      .returns({ success: true, data: { actions } })

    utilsStub.sendGoogleFunctionResponse = ({ statusCode, body }) => {
      expect(statusCode).to.equal(200)
      expect(body).to.deep.equal({
        actions: [{ some: 'action' }],
      })
    }

    await googleFunction.extensionTrigger(mockRequest)
    paymentHandler.handlePayment.restore()
  })

  it('if accessing cloud function without payload, it should return 400 http status', async () => {
    const mockRequest = {}

    utilsStub.sendGoogleFunctionResponse = ({ statusCode, body }) => {
      expect(statusCode).to.equal(400)
      expect(body).to.deep.equal({
        errors: [
          {
            code: 'BadRequest',
            message: 'Invalid body payload.',
          },
        ],
      })
    }

    await googleFunction.extensionTrigger(mockRequest)
  })

  it('if unexpected error is thrown from payment handling, it should return 400 http status', async () => {
    const mockRequest = {
      body: {
        resource: { obj: {} },
      },
    }

    sandbox.stub(paymentHandler, 'handlePayment').throws()

    utilsStub.sendGoogleFunctionResponse = ({ statusCode, body }) => {
      expect(statusCode).to.equal(400)
      expect(body.errors[0].code).to.equal('BadRequest')
    }

    await googleFunction.extensionTrigger(mockRequest)
  })
})
