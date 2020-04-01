const { expect } = require('chai')
const _ = require('lodash')

const ctpClientBuilder = require('../../src/ctp/ctp-client')
const iTSetUp = require('./integration-test-set-up')
const c = require('../../src/config/constants')

describe('::getPaymentMethods::', () => {
  let ctpClient

  before(async () => {
    ctpClient = ctpClientBuilder.get()
    await iTSetUp.initServerAndExtension(ctpClient)
  })

  after(async () => {
    await iTSetUp.cleanupResources(ctpClient)
  })

  it('given a payment ' +
    'when getPaymentMethodsRequest custom field is set and custom field getPaymentMethodsResponse is not set ' +
    'then should set custom field getPaymentMethodsResponse ' +
    'and interface interaction with type getPaymentMethods', async () => {
    const requestDraft = {
      countryCode: "DE",
      shopperLocale: "de-DE",
      amount: {
        currency: "EUR",
        value: 1000
      }
    }
    const paymentDraft = {
      amountPlanned: {
        currencyCode: 'EUR',
        centAmount: 1000,
      },
      paymentMethodInfo: {
        paymentInterface: c.CTP_ADYEN_INTEGRATION
      },
      custom: {
        type: {
          typeId: "type",
          key: c.CTP_WEB_COMPONENTS_PAYMENT_TYPE_KEY
        },
        fields: {
          getPaymentMethodsRequest: JSON.stringify(requestDraft)
        }
      }
    }

    const { statusCode, body: payment } = await ctpClient.create(ctpClient.builder.payments, paymentDraft)
    expect(statusCode).to.equal(201)

    const { getPaymentMethodsRequest, getPaymentMethodsResponse } = payment.custom.fields
    expect(getPaymentMethodsRequest).to.be.deep.equal(JSON.stringify(requestDraft))

    const interfaceInteraction = payment.interfaceInteractions
      .find(interaction => interaction.fields.type === c.CTP_INTERACTION_TYPE_GET_PAYMENT_METHODS)
    expect(interfaceInteraction).to.not.undefined
    expect(getPaymentMethodsResponse).to.be.deep.equal(interfaceInteraction.fields.response)

    expect(JSON.parse(interfaceInteraction.fields.request)).to.be.deep.equal({
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
      ...requestDraft
    })

    const interfaceInteractionResponse = JSON.parse(interfaceInteraction.fields.response)
    expect(interfaceInteractionResponse.groups).to.be.an.instanceof(Array)
    expect(interfaceInteractionResponse.paymentMethods).to.be.an.instanceof(Array)
    expect(interfaceInteractionResponse.additionalData).to.not.exist
  })
})
