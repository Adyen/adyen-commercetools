const { expect } = require('chai')

const ctpClientBuilder = require('../../src/ctp/ctp-client')
const iTSetUp = require('./integration-test-set-up')
const c = require('../../src/config/constants')

describe('::getOriginKeys::', () => {
  let ctpClient

  before(async () => {
    ctpClient = ctpClientBuilder.get()
    await iTSetUp.initServerAndExtension(ctpClient)
  })

  afterEach(async () => {
    await iTSetUp.stopRunningServers()
  })

  it('given a payment ' +
    'when getOriginKeysRequest custom field is set and custom field getOriginKeysResponse is not set ' +
    'then should set custom field getOriginKeysResponse ' +
    'and interface interaction with type getOriginKeysRequest', async () => {
    const getOriginKeysRequestDraft = {
      originDomains: [
        'http://localhost:8080',
        'http://localhost:8081'
      ]
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
          typeId: 'type',
          key: c.CTP_PAYMENT_CUSTOM_TYPE_KEY
        },
        fields: {
          getOriginKeysRequest: JSON.stringify(getOriginKeysRequestDraft)
        }
      }
    }

    const { statusCode, body: payment } = await ctpClient.create(ctpClient.builder.payments, paymentDraft)
    expect(statusCode).to.equal(201)

    const { getOriginKeysRequest, getOriginKeysResponse } = payment.custom.fields
    expect(getOriginKeysRequest).to.be.deep.equal(JSON.stringify(getOriginKeysRequestDraft))

    const interfaceInteraction = payment.interfaceInteractions
      .find(interaction => interaction.fields.type === c.CTP_INTERACTION_TYPE_GET_ORIGIN_KEYS)
    expect(interfaceInteraction).to.not.undefined
    expect(getOriginKeysResponse).to.be.deep.equal(interfaceInteraction.fields.response)

    expect(JSON.parse(interfaceInteraction.fields.request)).to.be.deep.equal({
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
      ...getOriginKeysRequestDraft
    })

    const interfaceInteractionResponse = JSON.parse(interfaceInteraction.fields.response)
    expect(interfaceInteractionResponse.originKeys).to.exist
  })
})
