import nock from 'nock'
import _ from 'lodash'
import sinon from 'sinon'
import { expect } from 'chai'
import paymentHandler from '../../src/paymentHandler/payment-handler.js'
import config from '../../src/config/config.js'
import createSessionSuccessResponse from './fixtures/adyen-create-session-success-response.js'
import utils from '../../src/utils.js'

const { handlePayment } = paymentHandler

describe('payment-handler-lineItems::execute', () => {
  let ctpPayment
  let ctpCart
  let scope

  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const commercetoolsProjectKey = config.getAllCtpProjectKeys()[0]

  let sandbox

  before(async () => {
    ctpPayment = await utils.readAndParseJsonFile(
      'test/unit/fixtures/ctp-payment.json',
    )
    ctpCart = await utils.readAndParseJsonFile(
      'test/unit/fixtures/ctp-cart.json',
    )
  })

  beforeEach(() => {
    const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
    scope = nock(`${adyenConfig.apiBaseUrl}`)
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    nock.cleanAll()
    sandbox.restore()
  })

  it(
    'when addCommercetoolsLineItems is enabled on app config and payment type that requires lineItems' +
      'then it should add lineItems to createSessionRequest',
    async () => {
      _mockCtpCartsEndpoint()
      scope.post('/sessions').reply(200, createSessionSuccessResponse)

      const createSessionRequest = {
        reference: 'YOUR_REFERENCE',
        amount: {
          value: 1000,
          currency: 'EUR',
        },
        returnUrl: 'https://your-company.com/',
      }

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.createSessionRequest =
        JSON.stringify(createSessionRequest)
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount
      ctpPaymentClone.custom.fields.commercetoolsProjectKey =
        commercetoolsProjectKey

      sandbox.stub(config, 'getModuleConfig').returns({
        addCommercetoolsLineItems: true,
      })

      const response = await handlePayment(ctpPaymentClone)
      const createSessionRequestInteraction = JSON.parse(
        response.actions.find((a) => a.action === 'addInterfaceInteraction')
          .fields.request,
      )
      const createSessionRequestJson = JSON.parse(
        createSessionRequestInteraction.body,
      )
      expect(createSessionRequestJson.lineItems).to.have.lengthOf(3)
    },
  )

  it(
    'when addCommercetoolsLineItems set true on createSessionRequest' +
      'then it should add lineItems to createSessionRequest',
    async () => {
      _mockCtpCartsEndpoint()
      scope.post('/sessions').reply(200, createSessionSuccessResponse)

      const createSessionRequest = {
        reference: 'YOUR_REFERENCE',

        addCommercetoolsLineItems: true,
      }

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.createSessionRequest =
        JSON.stringify(createSessionRequest)
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount
      ctpPaymentClone.custom.fields.commercetoolsProjectKey =
        commercetoolsProjectKey

      sandbox.stub(config, 'getModuleConfig').returns({
        addCommercetoolsLineItems: false,
      })

      const response = await handlePayment(ctpPaymentClone)

      const createSessionRequestInteraction = JSON.parse(
        response.actions.find((a) => a.action === 'addInterfaceInteraction')
          .fields.request,
      )
      const createSessionRequestJson = JSON.parse(
        createSessionRequestInteraction.body,
      )
      expect(createSessionRequestJson.lineItems).to.have.lengthOf(3)
    },
  )

  it(
    'when addCommercetoolsLineItems set false on createSessionRequest' +
      'then it should not add lineItems to createSessionRequest',
    async () => {
      _mockCtpCartsEndpoint()
      scope.post('/sessions').reply(200, createSessionSuccessResponse)

      const createSessionRequest = {
        reference: 'YOUR_REFERENCE',

        addCommercetoolsLineItems: false,
      }

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.createSessionRequest =
        JSON.stringify(createSessionRequest)
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount
      ctpPaymentClone.custom.fields.commercetoolsProjectKey =
        commercetoolsProjectKey

      sandbox.stub(config, 'getModuleConfig').returns({
        addCommercetoolsLineItems: false,
      })

      const response = await paymentHandler.handlePayment(ctpPaymentClone)
      const createSessionRequestInteraction = JSON.parse(
        response.actions.find((a) => a.action === 'addInterfaceInteraction')
          .fields.request,
      )
      const createSessionRequestJson = JSON.parse(
        createSessionRequestInteraction.body,
      )
      expect(createSessionRequestJson.lineItems).to.undefined
    },
  )

  it(
    'when addCommercetoolsLineItems is not enabled on app config, but addCommercetoolsLineItems set true ' +
      'on createSessionRequest then it should add lineItems to createSessionRequest',
    async () => {
      _mockCtpCartsEndpoint()
      scope.post('/sessions').reply(200, createSessionSuccessResponse)

      const createSessionRequest = {
        reference: 'YOUR_REFERENCE',
        addCommercetoolsLineItems: true,
      }

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.createSessionRequest =
        JSON.stringify(createSessionRequest)
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount
      ctpPaymentClone.custom.fields.commercetoolsProjectKey =
        commercetoolsProjectKey

      sandbox.stub(config, 'getModuleConfig').returns({
        addCommercetoolsLineItems: false,
      })

      const response = await handlePayment(ctpPaymentClone)
      const createSessionRequestInteraction = JSON.parse(
        response.actions.find((a) => a.action === 'addInterfaceInteraction')
          .fields.request,
      )
      const createSessionRequestJson = JSON.parse(
        createSessionRequestInteraction.body,
      )
      expect(createSessionRequestJson.lineItems).to.have.lengthOf(3)
    },
  )

  function _mockCtpCartsEndpoint(mockCart = ctpCart) {
    const ctpConfig = config.getCtpConfig(commercetoolsProjectKey)
    const ctpApiScope = nock(`${ctpConfig.apiUrl}`)
    const ctpAuthScope = nock(`${ctpConfig.authUrl}`)
    ctpAuthScope.post('/oauth/token').reply(200, {
      access_token: 'xxx',
      token_type: 'Bearer',
      expires_in: 172800,
      scope: 'manage_project:xxx',
    })
    ctpApiScope
      .get(`/${ctpConfig.projectKey}/carts`)
      .query(true)
      .reply(200, { results: [mockCart] })
  }
})
