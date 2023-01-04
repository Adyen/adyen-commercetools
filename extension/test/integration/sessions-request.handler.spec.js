import { expect } from 'chai'
import _ from 'lodash'
import ctpClientBuilder from '../../src/ctp.js'
import c from '../../src/config/constants.js'
import config from '../../src/config/config.js'
import utils from '../../src/utils.js'

describe('::create-session-request::', () => {
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
      'when createSessionRequest custom field is set and custom field createSessionResponse is not set ' +
      'then should set custom field createSessionResponse ' +
      'and interface interaction with type createSession',
    async () => {
      const createSessionRequestDraft = {
        countryCode: 'DE',
        reference: 'UNIQUE_PAYMENT_REFERENCE',
        returnUrl: '/',
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
            createSessionRequest: JSON.stringify(createSessionRequestDraft),
            commercetoolsProjectKey,
            adyenMerchantAccount,
          },
        },
      }

      const { statusCode, body: payment } = await ctpClient.create(
        ctpClient.builder.payments,
        paymentDraft
      )

      const createSessionRequestExtended = _.cloneDeep(
        createSessionRequestDraft
      )
      createSessionRequestExtended.applicationInfo = {
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

      const { createSessionRequest, createSessionResponse } =
        payment.custom.fields
      expect(createSessionRequest).to.be.deep.equal(
        JSON.stringify(createSessionRequestDraft)
      )

      const interfaceInteraction = payment.interfaceInteractions.find(
        (interaction) =>
          interaction.fields.type === c.CTP_INTERACTION_TYPE_CREATE_SESSION
      )
      expect(interfaceInteraction).to.not.undefined
      expect(createSessionResponse).to.be.deep.equal(
        interfaceInteraction.fields.response
      )

      const createSessionRequestInteraction = JSON.parse(
        interfaceInteraction.fields.request
      )
      const createSessionRequestBody = JSON.parse(
        createSessionRequestInteraction.body
      )

      delete createSessionRequestExtended.applicationInfo
      expect(createSessionRequestBody).to.be.deep.equal({
        merchantAccount: adyenMerchantAccount,
        ...createSessionRequestExtended,
      })

      const interfaceInteractionResponse = JSON.parse(
        interfaceInteraction.fields.response
      )
      expect(interfaceInteractionResponse.additionalData).to.not.exist
    }
  )
})
