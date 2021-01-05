const _ = require('lodash')
const proxyquire = require('proxyquire')
const { expect } = require('chai')

const ctpPayment = require('./fixtures/ctp-payment.json')
const errorMessages = require('../../src/validator/error-messages')

const utilsStub = {}
const paymentController = proxyquire(
  '../../src/api/payment/payment.controller',
  { '../../utils': utilsStub }
)

describe('Payment controller', () => {
  describe('Validation', () => {
    const mockRequest = { method: 'POST' }

    it('on missing adyen payment interface should skip processing', async () => {
      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.paymentMethodInfo.paymentInterface = ''

      utilsStub.collectRequestData = () =>
        JSON.stringify({ resource: { obj: ctpPaymentClone } })
      utilsStub.sendResponse = ({ statusCode, headers, data }) => {
        expect(statusCode).to.equal(200)
        expect(headers).to.not.exist
        expect(data).to.not.exist
      }

      await paymentController.processRequest(mockRequest)
    })

    it('on invalid web component request should throw error', async () => {
      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.getPaymentMethodsRequest = '{'

      utilsStub.collectRequestData = () =>
        JSON.stringify({ resource: { obj: ctpPaymentClone } })
      utilsStub.sendResponse = ({ statusCode, data }) => {
        expect(statusCode).to.equal(400)
        expect(data).to.deep.equal({
          errors: [
            {
              code: 'InvalidField',
              message: errorMessages.GET_PAYMENT_METHODS_REQUEST_INVALID_JSON,
            },
          ],
        })
      }

      await paymentController.processRequest(mockRequest)
    })
  })
})
