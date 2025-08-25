import nock from 'nock'
import _ from 'lodash'
import { expect } from 'chai'
import submitDonationsResponse from './fixtures/adyen-donation-success-response.js'
import donationHandler from '../../src/paymentHandler/donation.handler.js'
import config from '../../src/config/config.js'
import utils from '../../src/utils.js'

const { execute } = donationHandler

describe('donation-handler::execute', () => {
  let ctpPayment
  let scope

  const submitDonationRequest = {
    amount: {
      currency: "EUR",
      value: 100
    },
    returnUrl: "http://localhost:3000/thank-you",
    donationAccount: "testDonationAccount",
    donationToken: "testToken",
    merchantAccount: "testMerchantAccount",
    reference: "testReference",
    donationOriginalPspReference: "testPSP",
    paymentMethod: {
      type: "mc"
    },
    shopperInteraction: "ContAuth"
  }
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]

  before(async () => {
    ctpPayment = await utils.readAndParseJsonFile(
      'test/unit/fixtures/ctp-payment-make-payment.json',
    )
  })

  beforeEach(() => {
    const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
    scope = nock(`${adyenConfig.apiBaseUrl}`)
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it(
    'when response is successful add custom field action ',
    async () => {
      scope
        .post('/donations')
        .reply(200, submitDonationsResponse)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.donationRequest =
        JSON.stringify(submitDonationRequest)
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const response = await execute(ctpPaymentClone)

      expect(response.actions).to.have.lengthOf(1)


      const donationResponseAction = response.actions.find(
        (a) => a.action === 'setCustomField' && a.name === 'donationResponse',
      )

      const donationResponse = JSON.parse(donationResponseAction.value)

      expect(donationResponse.id).to.equal('testId');
      expect(donationResponse.donationAccount).to.equal('testDonationAccount');
      expect(donationResponse.merchantAccount).to.equal('testAcc');
      expect(donationResponse.reference).to.equal('test');
      expect(donationResponse.status).to.equal('completed');
      expect(donationResponse.amount.currency).to.equal('EUR');
      expect(donationResponse.amount.value).to.equal(100);
      expect(donationResponse.payment.pspReference).to.equal('testPSP');
      expect(donationResponse.payment.resultCode).to.equal('Authorised');
      expect(donationResponse.payment.merchantReference).to.equal('testMerchantReference');
      expect(donationResponse.payment.paymentMethod.type).to.equal('test');
      expect(donationResponse.payment.amount.currency).to.equal('EUR');
      expect(donationResponse.payment.amount.value).to.equal(100);
    },
  )
})
