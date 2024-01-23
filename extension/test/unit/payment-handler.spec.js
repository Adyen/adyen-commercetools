import nock from 'nock'
import _ from 'lodash'
import { expect } from 'chai'
import paymentHandler from '../../src/paymentHandler/payment-handler.js'
import config from '../../src/config/config.js'
import c from '../../src/config/constants.js'
import errorMessage from '../../src/validator/error-messages.js'
import utils from '../../src/utils.js'

describe('payment-handler::execute', () => {
  let ctpPayment

  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const ctpProjectKey = config.getAllCtpProjectKeys()[0]

  before(async () => {
    ctpPayment = await utils.readAndParseJsonFile(
      'test/unit/fixtures/ctp-payment.json',
    )
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it(
    'when "commercetoolsProjectKey" and "adyenMerchantAccount" are missing, ' +
      'then it should fail to create session and return errors',
    async () => {
      const ctpPaymentClone = _.cloneDeep(ctpPayment)

      const response = await paymentHandler.handlePayment(ctpPaymentClone)

      expect(response.errors).to.have.lengthOf(2)
      expect(response.errors[0].message).to.equal(
        errorMessage.MISSING_REQUIRED_FIELDS_CTP_PROJECT_KEY,
      )
      expect(response.errors[1].message).to.equal(
        errorMessage.MISSING_REQUIRED_FIELDS_ADYEN_MERCHANT_ACCOUNT,
      )
    },
  )

  describe('amountPlanned', () => {
    it(
      'is different than the amount in create session request custom field and interface interaction is empty, ' +
        'then it should return errors',
      async () => {
        const ctpPaymentClone = _.cloneDeep(ctpPayment)
        ctpPaymentClone.amountPlanned.centAmount = 0
        ctpPaymentClone.custom.fields.createSessionRequest = JSON.stringify({
          reference: 'YOUR_REFERENCE',
          amount: {
            currency: 'EUR',
            value: 1000,
          },
        })
        ctpPaymentClone.interfaceInteractions = []
        ctpPaymentClone.custom.fields.adyenMerchantAccount =
          adyenMerchantAccount
        ctpPaymentClone.custom.fields.commercetoolsProjectKey = ctpProjectKey

        const response = await paymentHandler.handlePayment(ctpPaymentClone)

        expect(response.errors).to.have.lengthOf.above(0)
        expect(response.errors[0].message).to.equal(
          errorMessage.CREATE_SESSION_AMOUNT_PLANNED_NOT_SAME,
        )
      },
    )

    it(
      'is 10 and create session request does not exist and interface interaction is empty, ' +
        'then it should not return errors',
      async () => {
        const ctpPaymentClone = _.cloneDeep(ctpPayment)
        ctpPaymentClone.amountPlanned.centAmount = 10
        ctpPaymentClone.custom.fields = {}
        ctpPaymentClone.interfaceInteractions = []
        ctpPaymentClone.custom.fields.adyenMerchantAccount =
          adyenMerchantAccount
        ctpPaymentClone.custom.fields.commercetoolsProjectKey = ctpProjectKey

        const response = await paymentHandler.handlePayment(ctpPaymentClone)

        expect(response.actions).to.deep.equal([])
      },
    )

    it('is different than create session interface interaction, then it should return errors', async () => {
      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.amountPlanned.centAmount = 100
      ctpPaymentClone.custom.fields = {
        createSessionRequest: JSON.stringify({
          amount: {
            currency: 'EUR',
            value: 100,
          },
          reference: 'YOUR_REFERENCE',
        }),
      }
      ctpPaymentClone.interfaceInteractions = [
        {
          fields: {
            type: c.CTP_INTERACTION_TYPE_CREATE_SESSION,
            request: JSON.stringify({
              amount: {
                currency: 'EUR',
                value: 10,
              },
            }),
            createdAt: '2018-05-14T07:18:37.560Z',
          },
        },
      ]
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount
      ctpPaymentClone.custom.fields.commercetoolsProjectKey = ctpProjectKey

      const response = await paymentHandler.handlePayment(ctpPaymentClone)

      expect(response.errors[0].message).to.equal(
        errorMessage.CREATE_SESSION_AMOUNT_PLANNED_NOT_SAME,
      )
    })
  })
})
