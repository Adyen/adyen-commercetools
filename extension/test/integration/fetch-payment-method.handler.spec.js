const { expect } = require('chai')
const _ = require('lodash')

const ctpClientBuilder = require('../../src/ctp/ctp-client')
const iTSetUp = require('./integration-test-set-up')
const c = require('../../src/config/constants')

describe('fetch payment', () => {
  let ctpClient

  before(async () => {
    ctpClient = ctpClientBuilder.get()
    await iTSetUp.initServerAndExtension(ctpClient)
  })

  after(async () => {
    await iTSetUp.cleanupResources(ctpClient)
  })

  it('should fetch payment methods when getPaymentMethodsRequest custom field is set', async () => {
    const getPaymentMethodsRequest = {
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
          getPaymentMethodsRequest: JSON.stringify(getPaymentMethodsRequest)
        }
      }
    }

    const response = await ctpClient.create(ctpClient.builder.payments, paymentDraft)
    expect(response.statusCode).to.equal(201)

    const interfaceInteractionFields = response.body.interfaceInteractions[0].fields
    expect(interfaceInteractionFields.type).to.be.equal(c.CTP_INTERACTION_TYPE_FETCH_METHODS) // todo(ahmet)

    const adyenRequestBody = JSON.parse(JSON.parse(interfaceInteractionFields.request))
    expect(adyenRequestBody.merchantAccount).to.be.equal(process.env.ADYEN_MERCHANT_ACCOUNT)
    // todo(ahmet): request could be tested better.
    // expect(adyenRequestBody.countryCode).to.be.equal(paymentTemplate.custom.fields.countryCode)
    // expect(adyenRequestBody.amount.currency).to.be.equal(paymentTemplate.amountPlanned.currencyCode)
    // expect(adyenRequestBody.amount.value).to.be.equal(paymentTemplate.amountPlanned.centAmount)

    const adyenResponse = JSON.parse(interfaceInteractionFields.response)
    // todo(ahmet): response could be tested better.
    expect(adyenResponse.groups).to.be.an.instanceof(Array)
    expect(adyenResponse.paymentMethods).to.be.an.instanceof(Array)
    expect(adyenResponse.additionalData).to.not.exist
  })
})
