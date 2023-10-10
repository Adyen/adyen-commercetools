import nock from 'nock'
import { expect } from 'chai'
import c from '../../src/config/constants.js'
import getCarbonOffsetCostsHandler from '../../src/paymentHandler/get-carbon-offset-costs.handler.js'
import config from '../../src/config/config.js'

describe('get-carbon-offset-costs::execute::', () => {
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const getCarbonOffsetCostsRequest = {
    originCountry: 'BE',
    deliveryCountry: 'FR',
    packageWeight: {
      value: 2.2,
      unit: 'kg',
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
        getCarbonOffsetCostsRequest: JSON.stringify(
          getCarbonOffsetCostsRequest,
        ),
        adyenMerchantAccount,
      },
    },
  }

  let scope
  beforeEach(() => {
    const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
    scope = nock(`${adyenConfig.apiBaseUrl}`)
  })

  it('handlePayment should return the right actions', async () => {
    const getCarbonOffsetCostsResponse = JSON.stringify({
      deliveryOffset: {
        currency: 'EUR',
        value: 12,
      },
      totalOffset: {
        currency: 'EUR',
        value: 12,
      },
    })

    scope.post('/carbonOffsetCosts').reply(200, getCarbonOffsetCostsResponse)

    const result = await getCarbonOffsetCostsHandler.execute(paymentObject)

    expect(result.actions.length).to.equal(2)
    expect(result.actions[0].action).to.equal('addInterfaceInteraction')
    expect(result.actions[1].action).to.equal('setCustomField')
    const request = JSON.parse(result.actions[0].fields.request)
    expect(JSON.parse(request.body)).to.be.deep.includes(
      getCarbonOffsetCostsRequest,
    )
    expect(result.actions[0].fields.response).to.be.deep.equal(
      getCarbonOffsetCostsResponse,
    )
    expect(result.actions[0].fields.response).to.be.deep.equal(
      result.actions[1].value,
    )
    expect(result.actions[0].fields.type).to.equal(
      c.CTP_INTERACTION_TYPE_GET_CARBON_OFFSET_COSTS,
    )
    expect(result.actions[1].name).to.equal(c.CTP_CARBON_OFFSET_COSTS_RESPONSE)
  })

  it(
    'when adyen request fails ' +
      'then handlePayment should return the right actions with failed responses',
    async () => {
      const getCarbonOffsetCostsFailedResponse = JSON.stringify({
        status: 422,
        errorCode: '14_0417',
        message: 'The carbon credit project id is not configured.',
        errorType: 'validation',
      })
      scope
        .post('/carbonOffsetCosts')
        .reply(422, getCarbonOffsetCostsFailedResponse)

      const result = await getCarbonOffsetCostsHandler.execute(paymentObject)

      expect(result.actions.length).to.equal(2)
      expect(result.actions[0].action).to.equal('addInterfaceInteraction')
      expect(result.actions[1].action).to.equal('setCustomField')
      const request = JSON.parse(result.actions[0].fields.request)
      expect(JSON.parse(request.body)).to.be.deep.includes(
        getCarbonOffsetCostsRequest,
      )
      expect(result.actions[0].fields.response).to.equal(
        getCarbonOffsetCostsFailedResponse,
      )
      expect(result.actions[0].fields.type).to.equal(
        c.CTP_INTERACTION_TYPE_GET_CARBON_OFFSET_COSTS,
      )
      expect(result.actions[1].name).to.equal(
        c.CTP_CARBON_OFFSET_COSTS_RESPONSE,
      )
    },
  )
})
