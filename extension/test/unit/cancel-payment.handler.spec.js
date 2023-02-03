import nock from 'nock'
import _ from 'lodash'
import { expect } from 'chai'
import config from '../../src/config/config.js'
import cancelPaymentHandler from '../../src/paymentHandler/cancel-payment.handler.js'
import utils from '../../src/utils.js'

import constants from '../../src/config/constants.js'

const { execute } = cancelPaymentHandler

describe('cancel-payment::execute', () => {
  let scope
  let ctpPayment
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const cancelPaymentTransaction = {
    id: 'cancelTransactionId',
    key: 'payment-key',
    type: 'CancelAuthorization',
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
    scope = nock(
      `${adyenConfig.legacyApiBaseUrl}/Payment/${constants.ADYEN_LEGACY_API_VERSION.CANCEL}`
    )
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it('when refund payment request contains reference, then it should send this reference to Adyen', async () => {
    const ctpPaymentClone = _.cloneDeep(ctpPayment)
    ctpPaymentClone.key = '123456789'
    ctpPaymentClone.transactions.push(cancelPaymentTransaction)
    ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount

    const response = await execute(ctpPaymentClone)

    const adyenRequest = response.actions.find(
      (action) => action.action === 'addInterfaceInteraction'
    ).fields.request
    const adyenRequestJson = JSON.parse(adyenRequest)
    const requestBody = JSON.parse(adyenRequestJson.body)

    expect(requestBody.reference).to.equal(
      cancelPaymentTransaction.custom.fields.reference
    )
  })
})
