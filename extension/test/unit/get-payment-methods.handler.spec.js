import { expect } from 'chai'
import nock from 'nock'
import c from '../../src/config/constants.js'
import getPaymentMethodsHandler from '../../src/paymentHandler/get-payment-methods.handler.js'
import config from '../../src/config/config.js'

describe('get-payment-methods::execute::', () => {
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const getPaymentMethodsRequest = {
    countryCode: 'DE',
    shopperLocale: 'de-DE',
    amount: {
      currency: 'EUR',
      value: 1000,
    },
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
        getPaymentMethodsRequest: JSON.stringify(getPaymentMethodsRequest),
        adyenMerchantAccount,
      },
    },
  }

  const adyenCredentials = config.getAdyenConfig(
    paymentObject.custom.fields.adyenMerchantAccount,
  )

  afterEach(() => {
    nock.cleanAll()
  })

  it('handlePayment should return the right actions', async () => {
    const adyenGetPaymentResponse = {
      paymentMethods: [
        {
          configuration: {
            intent: 'capture',
          },
          name: 'PayPal',
          type: 'paypal',
        },
      ],
    }

    nock(`${adyenCredentials.apiBaseUrl}`)
      .post('/paymentMethods')
      .query(true)
      .reply(200, adyenGetPaymentResponse)

    const result = await getPaymentMethodsHandler.execute(paymentObject)

    expect(result.actions.length).to.equal(2)
    expect(result.actions[0].action).to.equal('addInterfaceInteraction')
    expect(result.actions[1].action).to.equal('setCustomField')
    const request = JSON.parse(result.actions[0].fields.request)
    expect(JSON.parse(request.body)).to.be.deep.includes(
      getPaymentMethodsRequest,
    )
    expect(result.actions[0].fields.response).to.be.deep.equal(
      JSON.stringify(adyenGetPaymentResponse),
    )
    expect(result.actions[0].fields.response).to.be.deep.equal(
      result.actions[1].value,
    )
    expect(result.actions[0].fields.type).to.equal(
      c.CTP_INTERACTION_TYPE_GET_PAYMENT_METHODS,
    )
    expect(result.actions[1].name).to.equal(
      c.CTP_CUSTOM_FIELD_GET_PAYMENT_METHODS_RESPONSE,
    )
  })

  it(
    'when adyen request fails ' +
      'then handlePayment should return the right actions with failed responses',
    async () => {
      const errorMsg = 'Unexpected exception'

      nock(`${adyenCredentials.apiBaseUrl}`)
        .post('/paymentMethods')
        .query(true)
        .replyWithError(errorMsg)

      const result = await getPaymentMethodsHandler.execute(paymentObject)

      expect(result.actions.length).to.equal(2)
      expect(result.actions[0].action).to.equal('addInterfaceInteraction')
      expect(result.actions[1].action).to.equal('setCustomField')
      const request = JSON.parse(result.actions[0].fields.request)
      expect(JSON.parse(request.body)).to.be.deep.includes(
        getPaymentMethodsRequest,
      )
      expect(result.actions[0].fields.response).to.be.includes(errorMsg)
      expect(result.actions[0].fields.type).to.equal(
        c.CTP_INTERACTION_TYPE_GET_PAYMENT_METHODS,
      )
      expect(result.actions[1].name).to.equal(
        c.CTP_CUSTOM_FIELD_GET_PAYMENT_METHODS_RESPONSE,
      )
    },
  )
})
