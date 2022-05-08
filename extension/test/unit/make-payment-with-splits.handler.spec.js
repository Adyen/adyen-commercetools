import nock from 'nock'
import { expect } from 'chai'
import c from '../../src/config/constants.js'
import config from '../../src/config/config.js'
import makePaymentHandler from '../../src/paymentHandler/make-payment.handler.js'

const { execute } = makePaymentHandler

describe('make-payment-with-splits::execute', () => {
  let scope

  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const makePaymentWithSplitsRequest = {
    amount: {
      currency: 'EUR',
      value: 512,
    },
    splits: [
      {
        amount: {
          value: 12,
        },
        type: 'BalanceAccount',
        account: 'BA0000X000000X0XXX0X00XXX',
        reference: 'Restore',
      },
      {
        amount: {
          value: 500,
        },
        type: 'Default',
        reference: 'Payment',
      },
    ],
    paymentMethod: {
      type: 'scheme',
      encryptedCardNumber: 'test_4111111111111111',
      encryptedExpiryMonth: 'test_03',
      encryptedExpiryYear: 'test_2030',
      encryptedSecurityCode: 'test_737',
    },
    reference: 'payment-with-planet-fees',
    merchantAccount: adyenMerchantAccount,
    returnUrl: 'https://planet-friendly.merchant/shopperReturn',
  }
  const paymentObject = {
    amountPlanned: {
      currencyCode: 'EUR',
      centAmount: 1000,
    },
    paymentMethodInfo: {
      paymentInterface: c.CTP_ADYEN_INTEGRATION,
    },
    interfaceInteractions: [],
    custom: {
      type: {
        typeId: 'type',
        key: c.CTP_PAYMENT_CUSTOM_TYPE_KEY,
      },
      fields: {
        commercetoolsProjectKey: 'commercetoolsProjectKey',
        makePaymentRequest: JSON.stringify(makePaymentWithSplitsRequest),
        adyenMerchantAccount,
      },
    },
  }

  beforeEach(() => {
    const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
    scope = nock(`${adyenConfig.apiBaseUrl}`)
  })

  it(
    'given a payment with splits (restore and payment) ' +
      'when resultCode from Adyen is "Authorized", ' +
      'then it should return actions "addInterfaceInteraction", "setCustomField", "setKey" and "addTransaction"',
    async () => {
      const paymentSuccessResponse = JSON.stringify({
        pspReference: '853587031437598F',
        resultCode: 'Authorised',
        amount: {
          currency: 'EUR',
          value: 512,
        },
        merchantReference: 'payment-with-planet-fees',
      })

      scope.post('/payments').reply(200, paymentSuccessResponse)

      const response = await execute(paymentObject)

      expect(response.actions).to.have.lengthOf(6)

      const setMethodInfoMethod = response.actions.find(
        (a) => a.action === 'setMethodInfoMethod'
      )
      expect(setMethodInfoMethod.method).to.equal('scheme')

      const setMethodInfoName = response.actions.find(
        (a) => a.action === 'setMethodInfoName'
      )
      expect(setMethodInfoName.name).to.eql({ en: 'Credit Card' })

      const addInterfaceInteraction = response.actions.find(
        (a) => a.action === 'addInterfaceInteraction'
      )
      expect(addInterfaceInteraction.fields.type).to.equal('makePayment')
      expect(addInterfaceInteraction.fields.request).to.be.a('string')
      expect(addInterfaceInteraction.fields.response).to.be.a('string')
      expect(addInterfaceInteraction.fields.createdAt).to.be.a('string')

      const request = JSON.parse(addInterfaceInteraction.fields.request)
      expect(request.reference).to.deep.equal(
        makePaymentWithSplitsRequest.reference
      )
      expect(request.riskData).to.deep.equal(
        makePaymentWithSplitsRequest.riskData
      )
      expect(request.paymentMethod).to.deep.equal(
        makePaymentWithSplitsRequest.paymentMethod
      )
      expect(request.browserInfo).to.deep.equal(
        makePaymentWithSplitsRequest.browserInfo
      )
      expect(request.amount).to.deep.equal(makePaymentWithSplitsRequest.amount)
      expect(request.merchantAccount).to.equal(adyenMerchantAccount)

      const setCustomFieldAction = response.actions.find(
        (a) => a.action === 'setCustomField'
      )
      expect(setCustomFieldAction.name).to.equal('makePaymentResponse')
      expect(setCustomFieldAction.value).to.be.a('string')
      expect(setCustomFieldAction.value).to.equal(
        addInterfaceInteraction.fields.response
      )

      const setKeyAction = response.actions.find((a) => a.action === 'setKey')
      expect(setKeyAction.key).to.equal(makePaymentWithSplitsRequest.reference)

      const addTransaction = response.actions.find(
        (a) => a.action === 'addTransaction'
      )
      expect(addTransaction.transaction).to.be.a('object')
      expect(addTransaction.transaction.type).to.equal('Authorization')
      expect(addTransaction.transaction.state).to.equal('Success')
      expect(addTransaction.transaction.interactionId).to.equal(
        JSON.parse(paymentSuccessResponse).pspReference
      )
    }
  )
})
