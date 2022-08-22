import nock from 'nock'
import _ from 'lodash'
import { expect } from 'chai'
import config from '../../src/config/config.js'
import refundPaymentHandler from '../../src/paymentHandler/refund-payment.handler.js'
import utils from '../../src/utils.js'
import paymentSuccessResponse from './fixtures/adyen-make-payment-success-response.js'

const { execute } = refundPaymentHandler

describe('refund-payment::execute', () => {
  let scope
  let ctpPayment
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const refundPaymentTransaction = {
    key: 'payment-key',
    type: 'Refund',
    amount: {
      type: 'centPrecision',
      currencyCode: 'EUR',
      centAmount: 500,
      fractionDigits: 2,
    },
    custom: {
      type: {
        typeId: 'type',
        id: '9f7d21aa-264e-43ea-a540-acb9c28aa6be',
      },
      fields: {
        reference: '123456789',
      },
    },
    interactionId: '883658923110097B',
    state: 'Initial',
  }

  before(async () => {
    ctpPayment = await utils.readAndParseJsonFile(
      'test/unit/fixtures/ctp-payment.json'
    )
  })

  beforeEach(() => {
    const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
    scope = nock(`${adyenConfig.apiBaseUrl}`)
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it('when refund payment request contains reference, then it should send this reference to Adyen', async () => {
    scope.post('/payments').reply(200, paymentSuccessResponse)

    const ctpPaymentClone = _.cloneDeep(ctpPayment)

    ctpPaymentClone.transactions.push(refundPaymentTransaction)
    ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount

    const response = await execute(ctpPaymentClone)

    const adyenRequest = response.actions.find(
      (action) => action.action === 'addInterfaceInteraction'
    ).fields.request
    const adyenRequestJson = JSON.parse(adyenRequest)
    const requestBody = JSON.parse(adyenRequestJson.body)

    expect(requestBody.reference).to.equal(
      refundPaymentTransaction.custom.fields.reference
    )
  })
})
