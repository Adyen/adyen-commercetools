const { expect } = require('chai')
const _ = require('lodash')

const ctpClientBuilder = require('../../src/ctp')
const iTSetUp = require('./integration-test-set-up')
const c = require('../../src/config/constants')
const packageJson = require('../../package.json')

describe('::getPaymentMethods::', () => {
  let ctpClient

  before(async () => {
    ctpClient = ctpClientBuilder.get()
    await iTSetUp.initServerAndExtension({ ctpClient })
  })

  after(async () => {
    await iTSetUp.stopRunningServers()
  })

  it(
    'given a payment ' +
      'when getPaymentMethodsRequest custom field is set and custom field getPaymentMethodsResponse is not set ' +
      'then should set custom field getPaymentMethodsResponse ' +
      'and interface interaction with type getPaymentMethods',
    async () => {
      const getPaymentMethodsRequestDraft = {
        countryCode: 'DE',
        shopperLocale: 'de-DE',
        amount: {
          currency: 'EUR',
          value: 1000,
        },
      }
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
            getPaymentMethodsRequest: JSON.stringify(
              getPaymentMethodsRequestDraft
            ),
          },
        },
      }

      const { statusCode, body: payment } = await ctpClient.create(
        ctpClient.builder.payments,
        paymentDraft
      )

      const getPaymentMethodsRequestExtended = _.cloneDeep(
        getPaymentMethodsRequestDraft
      )
      getPaymentMethodsRequestExtended.applicationInfo = {
        merchantApplication: {
          name: packageJson.name,
          version: packageJson.version,
        },
        externalPlatform: {
          name: 'commercetools',
          integrator: packageJson.author.name,
        },
      }
      expect(statusCode).to.equal(201)

      const {
        getPaymentMethodsRequest,
        getPaymentMethodsResponse,
      } = payment.custom.fields
      expect(getPaymentMethodsRequest).to.be.deep.equal(
        JSON.stringify(getPaymentMethodsRequestDraft)
      )

      const interfaceInteraction = payment.interfaceInteractions.find(
        (interaction) =>
          interaction.fields.type === c.CTP_INTERACTION_TYPE_GET_PAYMENT_METHODS
      )
      expect(interfaceInteraction).to.not.undefined
      expect(getPaymentMethodsResponse).to.be.deep.equal(
        interfaceInteraction.fields.response
      )

      expect(JSON.parse(interfaceInteraction.fields.request)).to.be.deep.equal({
        merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
        ...getPaymentMethodsRequestExtended,
      })

      const interfaceInteractionResponse = JSON.parse(
        interfaceInteraction.fields.response
      )
      expect(interfaceInteractionResponse.groups).to.be.an.instanceof(Array)
      expect(interfaceInteractionResponse.paymentMethods).to.be.an.instanceof(
        Array
      )
      expect(interfaceInteractionResponse.additionalData).to.not.exist
    }
  )

  it(
    'given a payment ' +
      'when getPaymentMethodsRequest custom fields is set and response is not ' +
      'then should set custom field getPaymentMethodsResponse ' +
      'and interface interaction with type getPaymentMethods',
    async () => {
      const getPaymentMethodsRequestDraft = {
        countryCode: 'DE',
        shopperLocale: 'de-DE',
        amount: {
          currency: 'EUR',
          value: 1000,
        },
      }
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
            getPaymentMethodsRequest: JSON.stringify(
              getPaymentMethodsRequestDraft
            ),
          },
        },
      }

      const { statusCode, body: payment } = await ctpClient.create(
        ctpClient.builder.payments,
        paymentDraft
      )

      const getPaymentMethodsRequestExtended = _.cloneDeep(
        getPaymentMethodsRequestDraft
      )
      getPaymentMethodsRequestExtended.applicationInfo = {
        merchantApplication: {
          name: packageJson.name,
          version: packageJson.version,
        },
        externalPlatform: {
          name: 'commercetools',
          integrator: packageJson.author.name,
        },
      }
      expect(statusCode).to.equal(201)

      const {
        getPaymentMethodsRequest,
        getPaymentMethodsResponse,
      } = payment.custom.fields
      expect(getPaymentMethodsRequest).to.be.deep.equal(
        JSON.stringify(getPaymentMethodsRequestDraft)
      )

      const paymentMethodsInteraction = payment.interfaceInteractions.find(
        (interaction) =>
          interaction.fields.type === c.CTP_INTERACTION_TYPE_GET_PAYMENT_METHODS
      )
      expect(paymentMethodsInteraction).to.not.undefined
      expect(getPaymentMethodsResponse).to.be.deep.equal(
        paymentMethodsInteraction.fields.response
      )

      expect(
        JSON.parse(paymentMethodsInteraction.fields.request)
      ).to.be.deep.equal({
        merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
        ...getPaymentMethodsRequestExtended,
      })

      const paymentMethodsInteractionResponse = JSON.parse(
        paymentMethodsInteraction.fields.response
      )
      expect(paymentMethodsInteractionResponse.groups).to.be.an.instanceof(
        Array
      )
      expect(
        paymentMethodsInteractionResponse.paymentMethods
      ).to.be.an.instanceof(Array)
      expect(paymentMethodsInteractionResponse.additionalData).to.not.exist
    }
  )
})
