import _ from 'lodash'
import proxyquire from 'proxyquire'
import { expect } from 'chai'
import ctpPayment from './fixtures/ctp-payment.json'
import errorMessages from '../../src/validator/error-messages'

const utilsStub = {}
const paymentController = proxyquire(
  '../../src/api/payment/payment.controller',
  { '../../utils.mjs': utilsStub }
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
        expect(data).to.deep.equal({
          actions: [],
        })
      }

      await paymentController.processRequest(mockRequest)
    })

    it('on invalid web component request should throw error', async () => {
      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.commercetoolsProjectKey = 'foo'
      ctpPaymentClone.custom.fields.adyenMerchantAccount = 'bar'
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

    it('on missing required custom fields should throw error', async () => {
      const ctpPaymentClone = _.cloneDeep(ctpPayment)

      utilsStub.collectRequestData = () =>
        JSON.stringify({ resource: { obj: ctpPaymentClone } })
      utilsStub.sendResponse = ({ statusCode, data }) => {
        expect(statusCode).to.equal(400)
        expect(data).to.deep.equal({
          errors: [
            {
              code: 'InvalidField',
              message: errorMessages.MISSING_REQUIRED_FIELDS_CTP_PROJECT_KEY,
            },
            {
              code: 'InvalidField',
              message:
                errorMessages.MISSING_REQUIRED_FIELDS_ADYEN_MERCHANT_ACCOUNT,
            },
          ],
        })
      }
      await paymentController.processRequest(mockRequest)
    })

    it('on request with incorrect http method should return 400 status response', async () => {
      const ctpPaymentClone = _.cloneDeep(ctpPayment)

      utilsStub.collectRequestData = () =>
        JSON.stringify({ resource: { obj: ctpPaymentClone } })
      utilsStub.sendResponse = ({ statusCode, data }) => {
        expect(statusCode).to.equal(400)
        expect(data).to.deep.equal({
          errors: [
            {
              code: 'InvalidInput',
              message: 'Invalid HTTP method.',
            },
          ],
        })
      }
      const mockGetRequest = { method: 'GET' }
      await paymentController.processRequest(mockGetRequest)
    })
  })

  it('on request with missing body in http request should return 400 status response', async () => {
    utilsStub.sendResponse = ({ statusCode, data }) => {
      expect(statusCode).to.equal(400)
      expect(data.errors).to.not.empty
      expect(data.errors).to.have.lengthOf(1)
      expect(data.errors[0].code).to.equal('General')
    }
    const mockPostRequest = { method: 'POST' }
    await paymentController.processRequest(mockPostRequest)
  })
})
