import nock from 'nock'
import _ from 'lodash'
import { expect } from 'chai'
import config from '../../src/config/config.js'
import cancelPaymentHandler from '../../src/paymentHandler/cancel-payment.handler.js'
import utils from '../../src/utils.js'

import constants from '../../src/config/constants.js'

const { CTP_INTERACTION_TYPE_CANCEL_PAYMENT } = constants

const { execute } = cancelPaymentHandler

describe('cancel-payment::execute', () => {
  let scope
  let ctpPayment
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const cancelPaymentTransaction = {
    id: 'cancelTransactionId',
    type: 'CancelAuthorization',
    amount: {
      type: 'centPrecision',
      currencyCode: 'EUR',
      centAmount: 500,
      fractionDigits: 2,
    },
    state: 'Initial',
  }

  const cancelPaymentResponse = {
    pspReference: '8825408195409505',
    response: '[cancel-received]',
  }

  before(async () => {
    ctpPayment = await utils.readAndParseJsonFile(
      'test/unit/fixtures/ctp-payment.json',
    )
  })

  beforeEach(() => {
    const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
    scope = nock(`${adyenConfig.apiBaseUrl}/payments/8835513921644842/`)
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it(
    'given a payment ' +
      'when "/cancel" request to Adyen is received successfully ' +
      'then it should return actions "addInterfaceInteraction", ' +
      '"changeTransactionState" and "changeTransactionInteractionId"',
    async () => {
      scope.post('/cancels').reply(200, cancelPaymentResponse)
      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.key = 'originalReference-ABCDEFG'
      ctpPaymentClone.transactions.push(cancelPaymentTransaction)
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const { actions } = await execute(ctpPaymentClone)

      expect(actions).to.have.lengthOf(3)

      const addInterfaceInteraction = actions.find(
        (a) => a.action === 'addInterfaceInteraction',
      )
      expect(addInterfaceInteraction.fields.type).to.equal(
        CTP_INTERACTION_TYPE_CANCEL_PAYMENT,
      )
      expect(addInterfaceInteraction.fields.request).to.be.a('string')
      expect(addInterfaceInteraction.fields.response).to.equal(
        JSON.stringify(cancelPaymentResponse),
      )
      expect(addInterfaceInteraction.fields.createdAt).to.be.a('string')

      const changeTransactionState = actions.find(
        (a) => a.action === 'changeTransactionState',
      )
      expect(changeTransactionState).to.be.deep.equal({
        transactionId: 'cancelTransactionId',
        action: 'changeTransactionState',
        state: 'Pending',
      })

      const changeTransactionInteractionId = actions.find(
        (a) => a.action === 'changeTransactionInteractionId',
      )
      expect(changeTransactionInteractionId).to.be.deep.equal({
        transactionId: 'cancelTransactionId',
        action: 'changeTransactionInteractionId',
        interactionId: '8825408195409505',
      })
    },
  )
})
