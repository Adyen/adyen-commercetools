import { expect } from 'chai'
import _ from 'lodash'
import ctpClientBuilder from '../../src/ctp.js'
import c from '../../src/config/constants.js'
import config from '../../src/config/config.js'
import utils from '../../src/utils.js'

describe('::getPaymentMethods::', () => {
  let packageJson
  let ctpClient
  const [commercetoolsProjectKey] = config.getAllCtpProjectKeys()
  const [adyenMerchantAccount] = config.getAllAdyenMerchantAccounts()

  before(async () => {
    packageJson = await utils.readAndParseJsonFile('package.json')
    const ctpConfig = config.getCtpConfig(commercetoolsProjectKey)
    ctpClient = await ctpClientBuilder.get(ctpConfig)
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
              getPaymentMethodsRequestDraft,
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

      const getPaymentMethodsRequestExtended = _.cloneDeep(
        getPaymentMethodsRequestDraft,
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

      const { getPaymentMethodsRequest, getPaymentMethodsResponse } =
        payment.custom.fields
      expect(getPaymentMethodsRequest).to.be.deep.equal(
        JSON.stringify(getPaymentMethodsRequestDraft),
      )

      const interfaceInteraction = payment.interfaceInteractions.find(
        (interaction) =>
          interaction.fields.type ===
          c.CTP_INTERACTION_TYPE_GET_PAYMENT_METHODS,
      )
      expect(interfaceInteraction).to.not.undefined
      expect(getPaymentMethodsResponse).to.be.deep.equal(
        interfaceInteraction.fields.response,
      )

      const getPaymentMethodsRequestInteraction = JSON.parse(
        interfaceInteraction.fields.request,
      )
      const getPaymentMethodsRequestBody = JSON.parse(
        getPaymentMethodsRequestInteraction.body,
      )
      expect(getPaymentMethodsRequestBody).to.be.deep.equal({
        merchantAccount: adyenMerchantAccount,
        ...getPaymentMethodsRequestExtended,
      })

      const interfaceInteractionResponse = JSON.parse(
        interfaceInteraction.fields.response,
      )
      expect(interfaceInteractionResponse.paymentMethods).to.be.an.instanceof(
        Array,
      )
      expect(interfaceInteractionResponse.additionalData).to.not.exist
    },
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
              getPaymentMethodsRequestDraft,
            ),
            adyenMerchantAccount,
            commercetoolsProjectKey,
          },
        },
      }

      const { statusCode, body: payment } = await ctpClient.create(
        ctpClient.builder.payments,
        paymentDraft,
      )

      const getPaymentMethodsRequestExtended = _.cloneDeep(
        getPaymentMethodsRequestDraft,
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

      const { getPaymentMethodsRequest, getPaymentMethodsResponse } =
        payment.custom.fields
      expect(getPaymentMethodsRequest).to.be.deep.equal(
        JSON.stringify(getPaymentMethodsRequestDraft),
      )

      const paymentMethodsInteraction = payment.interfaceInteractions.find(
        (interaction) =>
          interaction.fields.type ===
          c.CTP_INTERACTION_TYPE_GET_PAYMENT_METHODS,
      )
      expect(paymentMethodsInteraction).to.not.undefined
      expect(getPaymentMethodsResponse).to.be.deep.equal(
        paymentMethodsInteraction.fields.response,
      )

      const getPaymentMethodsRequestInteraction = JSON.parse(
        paymentMethodsInteraction.fields.request,
      )
      const getPaymentMethodsRequestBody = JSON.parse(
        getPaymentMethodsRequestInteraction.body,
      )
      expect(getPaymentMethodsRequestBody).to.be.deep.equal({
        merchantAccount: adyenMerchantAccount,
        ...getPaymentMethodsRequestExtended,
      })

      const paymentMethodsInteractionResponse = JSON.parse(
        paymentMethodsInteraction.fields.response,
      )
      expect(
        paymentMethodsInteractionResponse.paymentMethods,
      ).to.be.an.instanceof(Array)
      expect(paymentMethodsInteractionResponse.additionalData).to.not.exist
    },
  )
})
