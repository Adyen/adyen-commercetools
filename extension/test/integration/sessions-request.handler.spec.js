import { expect } from 'chai'
import _ from 'lodash'
import ctpClientBuilder from '../../src/ctp.js'
import config from '../../src/config/config.js'
import utils from '../../src/utils.js'
import { initPaymentWithCart } from './integration-test-set-up.js'
import constants from '../../src/config/constants.js'

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
      const reference = `createSession-${new Date().getTime()}`
      const createSessionRequestDraft = {
        countryCode: 'DE',
        reference,
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
          paymentInterface: constants.CTP_ADYEN_INTEGRATION,
        },
        custom: {
          type: {
            typeId: 'type',
            key: constants.CTP_PAYMENT_CUSTOM_TYPE_KEY,
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
        paymentDraft,
      )

      const createSessionRequestExtended = _.cloneDeep(
        createSessionRequestDraft,
      )

      createSessionRequestExtended.metadata = {
        ctProjectKey: commercetoolsProjectKey,
      }
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

      expect(payment.key).to.equal(reference)
      const { createSessionRequest, createSessionResponse } =
        payment.custom.fields
      expect(createSessionRequest).to.be.deep.equal(
        JSON.stringify(createSessionRequestDraft),
      )

      const interfaceInteraction = payment.interfaceInteractions.find(
        (interaction) =>
          interaction.fields.type ===
          constants.CTP_INTERACTION_TYPE_CREATE_SESSION,
      )
      expect(interfaceInteraction).to.not.undefined
      expect(createSessionResponse).to.be.deep.equal(
        interfaceInteraction.fields.response,
      )

      const createSessionRequestInteraction = JSON.parse(
        interfaceInteraction.fields.request,
      )
      const createSessionRequestBody = JSON.parse(
        createSessionRequestInteraction.body,
      )

      expect(createSessionRequestBody).to.be.deep.equal({
        merchantAccount: adyenMerchantAccount,
        ...createSessionRequestExtended,
      })

      const interfaceInteractionResponse = JSON.parse(
        interfaceInteraction.fields.response,
      )
      expect(interfaceInteractionResponse.additionalData).to.not.exist
      expect(interfaceInteractionResponse.sessionData).to.not.undefined
    },
  )

  it(
    'given a payment with cart ' +
      'when createSession custom field and the addCommercetoolsLineItems set to true ' +
      'then should calculate and lineItems to the createSessionRequest',
    async () => {
      const payment = await initPaymentWithCart({
        ctpClient,
        adyenMerchantAccount,
        commercetoolsProjectKey,
      })

      const createSessionRequestDraft = {
        amount: {
          currency: 'EUR',
          value: 1000,
        },
        reference: `createSession3-${new Date().getTime()}`,

        returnUrl: 'https://your-company.com/',
        countryCode: 'NL',
        addCommercetoolsLineItems: true,
      }

      const { statusCode, body: updatedPayment } = await ctpClient.update(
        ctpClient.builder.payments,
        payment.id,
        payment.version,
        [
          {
            action: 'setCustomField',
            name: 'createSessionRequest',
            value: JSON.stringify(createSessionRequestDraft),
          },
        ],
      )
      expect(statusCode).to.equal(200)
      expect(updatedPayment.key).to.equal(createSessionRequestDraft.reference)

      const interfaceInteraction = updatedPayment.interfaceInteractions.find(
        (interaction) =>
          interaction.fields.type ===
          constants.CTP_INTERACTION_TYPE_CREATE_SESSION,
      )
      const createSessionRequest = JSON.parse(
        interfaceInteraction.fields.request,
      )
      const createSessionRequestBody = JSON.parse(createSessionRequest.body)
      expect(createSessionRequestBody.lineItems).to.have.lengthOf(3)
    },
  )
})
