const _ = require('lodash')
const proxyquire = require('proxyquire')
const { expect } = require('chai')

const ctpPayment = require('../fixtures/ctp-payment')
const errorMessages = require('../../src/validator/error-messages')

const utilsStub = {}
const paymentController = proxyquire('../../src/api/payment/payment.controller', { '../../utils': utilsStub })

describe('Payment controller', () => {
  describe('Validation', () => {
    const mockRequest = { method: 'POST' }

    it('on missing adyen payment interface should skip processing', async () => {
      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.paymentMethodInfo.paymentInterface = ''

      utilsStub.collectRequestData = () => JSON.stringify({ resource: { obj: ctpPaymentClone } })
      utilsStub.sendResponse = ({ statusCode, headers, data }) => {
        expect(statusCode).to.equal(200)
        expect(headers).to.not.exist
        expect(data).to.not.exist
      }

      await paymentController.processRequest(mockRequest)
    })

    it('on missing merchant reference should throw error', async () => {
      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.merchantReference = ''

      utilsStub.collectRequestData = () => JSON.stringify({ resource: { obj: ctpPaymentClone } })
      utilsStub.sendResponse = ({ statusCode, data }) => {
        expect(statusCode).to.equal(400)
        expect(data).to.deep.equal({
          errors: [{
            code: 'InvalidField',
            message: errorMessages.MISSING_MERCHANT_REFERENCE
          }]
        })
      }

      await paymentController.processRequest(mockRequest)
    })

    it('on wrong payment method should throw error', async () => {
      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields = { merchantReference: 'paymentReferenceId' }
      ctpPaymentClone.paymentMethodInfo.method = 'wrong method'

      utilsStub.collectRequestData = () => JSON.stringify({ resource: { obj: ctpPaymentClone } })
      utilsStub.sendResponse = ({ statusCode, data }) => {
        expect(statusCode).to.equal(400)
        expect(data).to.deep.equal({
          errors: [{
            code: 'InvalidField',
            message: errorMessages.INVALID_PAYMENT_METHOD
          }]
        })
      }

      await paymentController.processRequest(mockRequest)
    })

    it('on missing params for make paypal payment should throw error', async () => {
      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields = { merchantReference: 'paymentReferenceId' }
      ctpPaymentClone.paymentMethodInfo.method = 'paypal'
      ctpPaymentClone.transactions[0].state = 'Initial'

      utilsStub.collectRequestData = () => JSON.stringify({ resource: { obj: ctpPaymentClone } })
      utilsStub.sendResponse = ({ statusCode, data }) => {
        expect(statusCode).to.equal(400)
        expect(data).to.deep.equal({
          errors: [{
            code: 'InvalidField',
            message: errorMessages.MISSING_RETURN_URL
          }]
        })
      }

      await paymentController.processRequest(mockRequest)
    })

    it('on missing params for complete paypal payment should throw error', async () => {
      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields = { merchantReference: 'paymentReferenceId' }
      ctpPaymentClone.paymentMethodInfo.method = 'paypal'
      ctpPaymentClone.transactions[0].state = 'Pending'

      utilsStub.collectRequestData = () => JSON.stringify({ resource: { obj: ctpPaymentClone } })
      utilsStub.sendResponse = ({ statusCode, data }) => {
        expect(statusCode).to.equal(200)
        expect(data).to.deep.equal({ actions: [] })
      }

      await paymentController.processRequest(mockRequest)
    })

    it('on missing params for make credit card payment should throw error', async () => {
      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields = { merchantReference: 'paymentReferenceId' }
      ctpPaymentClone.paymentMethodInfo.method = 'creditCard'
      ctpPaymentClone.transactions[0].state = 'Initial'

      utilsStub.collectRequestData = () => JSON.stringify({ resource: { obj: ctpPaymentClone } })
      utilsStub.sendResponse = ({ statusCode, data }) => {
        expect(statusCode).to.equal(400)
        expect(data).to.deep.equal({
          errors: [
            {
              code: 'InvalidField',
              message: errorMessages.MISSING_CARD_NUMBER
            },
            {
              code: 'InvalidField',
              message: errorMessages.MISSING_EXPIRY_MONTH
            },
            {
              code: 'InvalidField',
              message: errorMessages.MISSING_EXPIRY_YEAR
            },
            {
              code: 'InvalidField',
              message: errorMessages.MISSING_SECURITY_CODE
            },
            {
              code: 'InvalidField',
              message: errorMessages.MISSING_RETURN_URL
            }
          ]
        })
      }
      await paymentController.processRequest(mockRequest)
    })

    it('on missing params for make 3ds payment should throw error', async () => {
      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields = { merchantReference: 'paymentReferenceId' }
      ctpPaymentClone.paymentMethodInfo.method = 'creditCard_3d'
      ctpPaymentClone.transactions[0].state = 'Initial'

      utilsStub.collectRequestData = () => JSON.stringify({ resource: { obj: ctpPaymentClone } })
      utilsStub.sendResponse = ({ statusCode, data }) => {
        expect(statusCode).to.equal(400)
        expect(data).to.deep.equal({
          errors: [
            {
              code: 'InvalidField',
              message: errorMessages.MISSING_CARD_NUMBER
            },
            {
              code: 'InvalidField',
              message: errorMessages.MISSING_EXPIRY_MONTH
            },
            {
              code: 'InvalidField',
              message: errorMessages.MISSING_EXPIRY_YEAR
            },
            {
              code: 'InvalidField',
              message: errorMessages.MISSING_SECURITY_CODE
            },
            {
              code: 'InvalidField',
              message: errorMessages.MISSING_RETURN_URL
            }
          ]
        })
      }
      await paymentController.processRequest(mockRequest)
    })

    it('on missing params for complete credit card payment should throw error', async () => {
      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields = { merchantReference: 'paymentReferenceId' }
      ctpPaymentClone.paymentMethodInfo.method = 'creditCard_3d'
      ctpPaymentClone.transactions[0].state = 'Pending'

      utilsStub.collectRequestData = () => JSON.stringify({ resource: { obj: ctpPaymentClone } })
      utilsStub.sendResponse = ({ statusCode, data }) => {
        expect(statusCode).to.equal(200)
        expect(data).to.deep.equal({ actions: [] })
      }
      await paymentController.processRequest(mockRequest)
    })
  })
})
