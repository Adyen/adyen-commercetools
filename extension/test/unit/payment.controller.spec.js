import _ from 'lodash'
import sinon from 'sinon'
import { expect } from 'chai'
import errorMessages from '../../src/validator/error-messages.js'
import paymentController from '../../src/api/payment/payment.controller.js'
import utils from '../../src/utils.js'

describe('Payment controller', () => {
  let ctpPayment

  beforeEach(async () => {
    ctpPayment = await utils.readAndParseJsonFile(
      'test/unit/fixtures/ctp-payment.json',
    )
  })

  describe('Validation', () => {
    const mockRequest = { method: 'POST' }

    it('on missing required custom fields should throw error', async () => {
      const ctpPaymentClone = _.cloneDeep(ctpPayment)

      const collectRequestData = () =>
        JSON.stringify({ resource: { obj: ctpPaymentClone } })
      const sendResponse = ({ statusCode, data }) => {
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

      sinon.stub(utils, 'collectRequestData').callsFake(collectRequestData)
      sinon.stub(utils, 'sendResponse').callsFake(sendResponse)

      await paymentController.processRequest(mockRequest)

      utils.collectRequestData.restore()
      utils.sendResponse.restore()
    })

    it('on request with incorrect http method should return 400 status response', async () => {
      const ctpPaymentClone = _.cloneDeep(ctpPayment)

      const collectRequestData = () =>
        JSON.stringify({ resource: { obj: ctpPaymentClone } })
      const utilsSendResponse = ({ statusCode, data }) => {
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

      sinon.stub(utils, 'collectRequestData').callsFake(collectRequestData)
      sinon.stub(utils, 'sendResponse').callsFake(utilsSendResponse)

      const mockGetRequest = { method: 'GET' }
      await paymentController.processRequest(mockGetRequest)

      utils.sendResponse.restore()
      utils.collectRequestData.restore()
    })
  })

  it('on request with missing body in http request should return 400 status response', async () => {
    const sendResponse = ({ statusCode, data }) => {
      expect(statusCode).to.equal(400)
      expect(data.errors).to.not.empty
      expect(data.errors).to.have.lengthOf(1)
      expect(data.errors[0].code).to.equal('General')
      expect(data.errors[0].message).to.equal(
        '[commercetools-adyen-integration-extension] ' +
          'Unexpected error (Payment ID: undefined): request.on is not a function.',
      )
    }

    sinon.stub(utils, 'sendResponse').callsFake(sendResponse)

    const mockPostRequest = { method: 'POST' }
    await paymentController.processRequest(mockPostRequest)
    utils.sendResponse.restore()
  })
})
