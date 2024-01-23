import { expect } from 'chai'
import ctpClientBuilder from '../../src/ctp.js'
import c from '../../src/config/constants.js'
import config from '../../src/config/config.js'

describe('get-carbon-offset-costs', () => {
  let ctpClient
  const [commercetoolsProjectKey] = config.getAllCtpProjectKeys()
  const [adyenMerchantAccount] = config.getAllAdyenMerchantAccounts()

  before(async () => {
    const ctpConfig = config.getCtpConfig(commercetoolsProjectKey)
    ctpClient = await ctpClientBuilder.get(ctpConfig)
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
      getCarbonOffsetCostsRequestDraft,
    )
    expect(interfaceInteractionResponse.deliveryOffset).to.exist
    expect(interfaceInteractionResponse.deliveryOffset.value).to.exist
    expect(interfaceInteractionResponse.totalOffset).to.exist
    // expect(interfaceInteractionResponse.totalOffset.value).to.greaterThan(0)
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
      getCarbonOffsetCostsRequestDraft,
    )
    expect(interfaceInteractionResponse.deliveryOffset).to.exist
    expect(interfaceInteractionResponse.deliveryOffset.value).to.exist
    expect(interfaceInteractionResponse.totalOffset).to.exist
    // expect(interfaceInteractionResponse.totalOffset.value).to.greaterThan(0)
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
            getCarbonOffsetCostsRequestDraft,
          ),
          commercetoolsProjectKey,
          adyenMerchantAccount,
        },
      },
    }

    const { statusCode, body: payment } = await ctpClient.create(
      ctpClient.builder.payments,
      paymentDraft,
    )
    expect(statusCode).to.equal(201)

    const { getCarbonOffsetCostsRequest, getCarbonOffsetCostsResponse } =
      payment.custom.fields
    expect(getCarbonOffsetCostsRequest).to.be.deep.equal(
      JSON.stringify(getCarbonOffsetCostsRequestDraft),
    )

    const interfaceInteraction = payment.interfaceInteractions.find(
      (interaction) =>
        interaction.fields.type ===
        c.CTP_INTERACTION_TYPE_GET_CARBON_OFFSET_COSTS,
    )
    expect(interfaceInteraction).to.not.undefined
    expect(getCarbonOffsetCostsResponse).to.be.deep.equal(
      interfaceInteraction.fields.response,
    )

    const request = JSON.parse(interfaceInteraction.fields.request)
    const requestBody = JSON.parse(request.body)
    expect(requestBody).to.be.deep.equal({
      merchantAccount: adyenMerchantAccount,
      ...getCarbonOffsetCostsRequestDraft,
    })

    return JSON.parse(interfaceInteraction.fields.response)
  }
})
