const { expect } = require('chai')

const ctpClientBuilder = require('../../src/ctp')
const c = require('../../src/config/constants')
const config = require('../../src/config/config')

describe('get-carbon-offset-costs', () => {
  let ctpClient
  const adyenMerchantAccount = Object.keys(
    JSON.parse(process.env.ADYEN_INTEGRATION_CONFIG).adyen
  )[0]
  const commercetoolsProjectKey = Object.keys(
    JSON.parse(process.env.ADYEN_INTEGRATION_CONFIG).commercetools
  )[0]

  before(async () => {
    const ctpConfig = config.getCtpConfig(commercetoolsProjectKey)
    ctpClient = ctpClientBuilder.get(ctpConfig)
  })

  it('should calculate delivery offset', async () => {
    const getCarbonOffsetCostsRequestDraft = {
      originCountry: 'BE',
      deliveryCountry: 'FR',
      packageWeight: {
        value: 2.2,
        unit: 'kg',
      },
    }
    const interfaceInteractionResponse = await getCarbonOffsetCosts(
      getCarbonOffsetCostsRequestDraft
    )
    expect(interfaceInteractionResponse.deliveryOffset).to.exist
    expect(interfaceInteractionResponse.totalOffset).to.exist
    expect(interfaceInteractionResponse.totalOffset.value).to.greaterThan(0)
  })

  it('should calculate delivery and product/lifecycle offset when products are set', async () => {
    const getCarbonOffsetCostsRequestDraft = {
      originCountry: 'BE',
      deliveryCountry: 'FR',
      packageWeight: {
        value: 2.2,
        unit: 'kg',
      },
      products: [
        {
          code: '123',
          weight: {
            value: 0.2,
            unit: 'kg',
          },
        },
        {
          code: '10001335',
          weight: {
            value: 2,
            unit: 'kg',
          },
        },
      ],
    }
    const interfaceInteractionResponse = await getCarbonOffsetCosts(
      getCarbonOffsetCostsRequestDraft
    )
    expect(interfaceInteractionResponse.deliveryOffset).to.exist
    expect(interfaceInteractionResponse.totalOffset).to.exist
    expect(interfaceInteractionResponse.totalOffset.value).to.greaterThan(0)
    expect(interfaceInteractionResponse.productOffset).to.exist
  })

  async function getCarbonOffsetCosts(getCarbonOffsetCostsRequestDraft) {
    const paymentDraft = {
      amountPlanned: {
        currencyCode: 'EUR',
        centAmount: 1000,
      },
      paymentMethodInfo: {
        paymentInterface: c.CTP_ADYEN_INTEGRATION,
      },
      custom: {
        type: {
          typeId: 'type',
          key: c.CTP_PAYMENT_CUSTOM_TYPE_KEY,
        },
        fields: {
          getCarbonOffsetCostsRequest: JSON.stringify(
            getCarbonOffsetCostsRequestDraft
          ),
          commercetoolsProjectKey,
          adyenMerchantAccount,
        },
      },
    }

    const { statusCode, body: payment } = await ctpClient.create(
      ctpClient.builder.payments,
      paymentDraft
    )
    expect(statusCode).to.equal(201)

    const { getCarbonOffsetCostsRequest, getCarbonOffsetCostsResponse } =
      payment.custom.fields
    expect(getCarbonOffsetCostsRequest).to.be.deep.equal(
      JSON.stringify(getCarbonOffsetCostsRequestDraft)
    )

    const interfaceInteraction = payment.interfaceInteractions.find(
      (interaction) =>
        interaction.fields.type ===
        c.CTP_INTERACTION_TYPE_GET_CARBON_OFFSET_COSTS
    )
    expect(interfaceInteraction).to.not.undefined
    expect(getCarbonOffsetCostsResponse).to.be.deep.equal(
      interfaceInteraction.fields.response
    )

    expect(JSON.parse(interfaceInteraction.fields.request)).to.be.deep.equal({
      merchantAccount: adyenMerchantAccount,
      ...getCarbonOffsetCostsRequestDraft,
    })

    return JSON.parse(interfaceInteraction.fields.response)
  }
})
