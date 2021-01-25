const { expect } = require('chai')
const sinon = require('sinon')
const fetch = require('node-fetch')
const c = require('../../src/config/constants')
const {
  execute,
} = require('../../src/paymentHandler/get-payment-methods.handler')

describe('get-payment-methods::execute::', () => {
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
        getPaymentMethodsRequest: JSON.stringify(getPaymentMethodsRequest),
      },
    },
  }

  afterEach(() => {
    sinon.restore()
  })

  it('handlePayment should return the right actions', async () => {
    const adyenGetPaymentResponse = {
      groups: [
        {
          name: 'Credit Card',
          types: ['visa', 'mc'],
        },
      ],
      paymentMethods: [
        {
          name: 'PayPal',
          supportsRecurring: true,
          type: 'paypal',
        },
      ],
    }

    sinon
      .stub(fetch, 'Promise')
      .resolves({ json: () => adyenGetPaymentResponse })

    const result = await execute(paymentObject)

    expect(result.actions.length).to.equal(2)
    expect(result.actions[0].action).to.equal('addInterfaceInteraction')
    expect(result.actions[1].action).to.equal('setCustomField')
    expect(JSON.parse(result.actions[0].fields.request)).to.be.deep.includes(
      getPaymentMethodsRequest
    )
    expect(result.actions[0].fields.response).to.be.deep.equal(
      JSON.stringify(adyenGetPaymentResponse)
    )
    expect(result.actions[0].fields.response).to.be.deep.equal(
      result.actions[1].value
    )
    expect(result.actions[0].fields.type).to.equal(
      c.CTP_INTERACTION_TYPE_GET_PAYMENT_METHODS
    )
    expect(result.actions[1].name).to.equal(
      c.CTP_CUSTOM_FIELD_GET_PAYMENT_METHODS_RESPONSE
    )
  })

  it(
    'when adyen request fails ' +
      'then handlePayment should return the right actions with failed responses',
    async () => {
      const errorMsg = 'unexpected exception'
      sinon.stub(fetch, 'Promise').rejects(errorMsg)

      const result = await execute(paymentObject)

      expect(result.actions.length).to.equal(2)
      expect(result.actions[0].action).to.equal('addInterfaceInteraction')
      expect(result.actions[1].action).to.equal('setCustomField')
      expect(JSON.parse(result.actions[0].fields.request)).to.be.deep.includes(
        getPaymentMethodsRequest
      )
      expect(result.actions[0].fields.response).to.be.includes(errorMsg)
      expect(result.actions[0].fields.type).to.equal(
        c.CTP_INTERACTION_TYPE_GET_PAYMENT_METHODS
      )
      expect(result.actions[1].name).to.equal(
        c.CTP_CUSTOM_FIELD_GET_PAYMENT_METHODS_RESPONSE
      )
    }
  )
})
