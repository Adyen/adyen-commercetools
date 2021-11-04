const { expect } = require('chai')
const sinon = require('sinon')
const fetch = require('node-fetch')
const c = require('../../src/config/constants')
const {
  execute,
} = require('../../src/paymentHandler/get-carbon-offset-costs.handler')
const config = require('../../src/config/config')

describe('get-carbon-offset-costs::execute::', () => {
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const getCarbonOffsetCostsRequest = {
    originCountry: 'BE',
    deliveryCountry: 'FR',
    packageWeight: {
      value: 2.20,
      unit: 'kg'
    }
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
        getCarbonOffsetCostsRequest: JSON.stringify(getCarbonOffsetCostsRequest),
        adyenMerchantAccount,
      },
    },
  }

  afterEach(() => {
    sinon.restore()
  })

  it('handlePayment should return the right actions', async () => {
    const getCarbonOffsetCostsResponse = {
      deliveryOffset: {
        currency: 'EUR',
        value: 12
      },
      totalOffset: {
        currency: 'EUR',
        value: 12
      }
    }

    sinon
      .stub(fetch, 'Promise')
      .resolves({ json: () => getCarbonOffsetCostsResponse })

    const result = await execute(paymentObject)

    expect(result.actions.length).to.equal(2)
    expect(result.actions[0].action).to.equal('addInterfaceInteraction')
    expect(result.actions[1].action).to.equal('setCustomField')
    expect(JSON.parse(result.actions[0].fields.request)).to.be.deep.includes(
      getCarbonOffsetCostsRequest
    )
    expect(result.actions[0].fields.response).to.be.deep.equal(
      JSON.stringify(getCarbonOffsetCostsResponse)
    )
    expect(result.actions[0].fields.response).to.be.deep.equal(
      result.actions[1].value
    )
    expect(result.actions[0].fields.type).to.equal(
      c.CTP_INTERACTION_TYPE_GET_CARBON_OFFSET_COSTS
    )
    expect(result.actions[1].name).to.equal(
      c.CTP_CARBON_OFFSET_COSTS_RESPONSE
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
        getCarbonOffsetCostsRequest
      )
      expect(result.actions[0].fields.response).to.be.includes(errorMsg)
      expect(result.actions[0].fields.type).to.equal(
        c.CTP_INTERACTION_TYPE_GET_CARBON_OFFSET_COSTS
      )
      expect(result.actions[1].name).to.equal(
        c.CTP_CARBON_OFFSET_COSTS_RESPONSE
      )
    }
  )
})
