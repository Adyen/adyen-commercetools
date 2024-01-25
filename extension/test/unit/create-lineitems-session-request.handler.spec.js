import nock from 'nock'
import { expect } from 'chai'
import _ from 'lodash'
import config from '../../src/config/config.js'
import createLineItemsSessionPaymentHandler from '../../src/paymentHandler/sessions-line-items-request.handler.js'
import createSessionSuccessResponse from './fixtures/adyen-create-session-success-response.js'
import utils from '../../src/utils.js'

describe('create-lineitems-session-request::execute', () => {
  let ctpPayment
  let ctpCart
  let ctpCartWithCustomShippingMethod
  const ADYEN_PERCENTAGE_MINOR_UNIT = 10000
  const DEFAULT_PAYMENT_LANGUAGE = 'en'
  let scope
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const commercetoolsProjectKey = config.getAllCtpProjectKeys()[0]

  before(async () => {
    ctpPayment = await utils.readAndParseJsonFile(
      'test/unit/fixtures/ctp-payment.json',
    )
    ctpCart = await utils.readAndParseJsonFile(
      'test/unit/fixtures/ctp-cart.json',
    )
    ctpCartWithCustomShippingMethod = await utils.readAndParseJsonFile(
      'test/unit/fixtures/ctp-cart-custom-shipping-method.json',
    )
  })

  /* eslint-enable max-len */
  beforeEach(() => {
    const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
    scope = nock(`${adyenConfig.apiBaseUrl}`)
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it(
    'when klarna request does not contain lineItems, ' +
      'then it should add lineItems correctly',
    async () => {
      _mockCtpCartsEndpoint()
      scope.post('/sessions').reply(200, createSessionSuccessResponse)

      const createSessionRequest = {
        reference: 'YOUR_REFERENCE',
      }

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.createSessionRequest =
        JSON.stringify(createSessionRequest)
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount
      ctpPaymentClone.custom.fields.commercetoolsProjectKey =
        commercetoolsProjectKey

      const response =
        await createLineItemsSessionPaymentHandler.execute(ctpPaymentClone)

      expect(response.actions).to.have.lengthOf(3)
      const createSessionRequestInteraction = JSON.parse(
        response.actions.find((a) => a.action === 'addInterfaceInteraction')
          .fields.request,
      )
      const createSessionRequestJson = JSON.parse(
        createSessionRequestInteraction.body,
      )
      const ctpLineItem = ctpCart.lineItems[0]
      const adyenLineItem = createSessionRequestJson.lineItems.find(
        (item) => item.id === 'test-product-sku-1',
      )
      expect(ctpLineItem.price.value.centAmount).to.equal(
        adyenLineItem.amountIncludingTax,
      )
      expect(
        parseFloat(
          (
            ctpLineItem.price.value.centAmount /
            (1 + ctpLineItem.taxRate.amount)
          ).toFixed(0),
        ),
      ).to.equal(adyenLineItem.amountExcludingTax)
      expect(
        ctpLineItem.price.value.centAmount -
          parseFloat(
            (
              ctpLineItem.price.value.centAmount /
              (1 + ctpLineItem.taxRate.amount)
            ).toFixed(0),
          ),
      ).to.equal(adyenLineItem.taxAmount)
      expect(ctpLineItem.taxRate.amount * ADYEN_PERCENTAGE_MINOR_UNIT).to.equal(
        adyenLineItem.taxPercentage,
      )

      const ctpShippingInfo = ctpCart.shippingInfo
      const adyenShippingInfo = createSessionRequestJson.lineItems.find(
        (item) => item.id === ctpShippingInfo.shippingMethodName,
      )
      expect(ctpShippingInfo.price.centAmount).to.equal(
        adyenShippingInfo.amountIncludingTax,
      )
      expect(
        parseFloat(
          (
            ctpShippingInfo.price.centAmount /
            (1 + ctpShippingInfo.taxRate.amount)
          ).toFixed(0),
        ),
      ).to.equal(adyenShippingInfo.amountExcludingTax)
      expect(
        ctpShippingInfo.price.centAmount -
          parseFloat(
            (
              ctpShippingInfo.price.centAmount /
              (1 + ctpShippingInfo.taxRate.amount)
            ).toFixed(0),
          ),
      ).to.equal(adyenShippingInfo.taxAmount)
      expect(
        ctpShippingInfo.taxRate.amount * ADYEN_PERCENTAGE_MINOR_UNIT,
      ).to.equal(adyenShippingInfo.taxPercentage)
    },
  )

  it(
    'when klarna request does contain lineItems, ' +
      'then it should not add lineItems',
    async () => {
      _mockCtpCartsEndpoint()

      scope.post('/sessions').reply(200, createSessionSuccessResponse)

      const createSessionRequest = {
        reference: 'YOUR_REFERENCE',
        lineItems: [],
      }

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.createSessionRequest =
        JSON.stringify(createSessionRequest)
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const response =
        await createLineItemsSessionPaymentHandler.execute(ctpPaymentClone)
      expect(response.actions).to.have.lengthOf(3)
      const createSessionRequestInteraction = JSON.parse(
        response.actions.find((a) => a.action === 'addInterfaceInteraction')
          .fields.request,
      )
      const createSessionRequestJson = JSON.parse(
        createSessionRequestInteraction.body,
      )
      expect(createSessionRequestJson.lineItems).to.deep.equal(
        createSessionRequest.lineItems,
      )
    },
  )

  it(
    'when locale is not existing, ' +
      'it should take the first locale in line item name',
    async () => {
      _mockCtpCartsEndpoint()
      scope.post('/sessions').reply(200, createSessionSuccessResponse)

      const ctpPaymentToTest = {
        amountPlanned: { centAmount: 100, currencyCode: 'EUR' },
        custom: {
          fields: {
            languageCode: 'nonExistingLanguageCode',
            createSessionRequest: JSON.stringify({
              reference: 'YOUR_REFERENCE',
            }),
            adyenMerchantAccount,
            commercetoolsProjectKey,
          },
        },
      }
      const response =
        await createLineItemsSessionPaymentHandler.execute(ctpPaymentToTest)
      const createSessionRequestInteraction = JSON.parse(
        response.actions.find((a) => a.action === 'addInterfaceInteraction')
          .fields.request,
      )
      const { lineItems } = JSON.parse(createSessionRequestInteraction.body)
      expect(lineItems).to.have.lengthOf(3)
      expect(lineItems[0].description).to.equal(
        Object.values(ctpCart.lineItems[0].name)[0],
      )
      expect(lineItems[1].description).to.equal(
        ctpCart.customLineItems[0].name[DEFAULT_PAYMENT_LANGUAGE],
      )
      expect(lineItems[2].description).to.equal(
        ctpCart.shippingInfo.shippingMethod.obj.description,
      )
    },
  )

  it(
    'when shipping info is not expanded, ' +
      'it should return default shipping name',
    async () => {
      const clonedCtpCart = _.cloneDeep(ctpCart)
      delete clonedCtpCart.shippingInfo.shippingMethod.obj
      _mockCtpCartsEndpoint(clonedCtpCart)
      scope.post('/sessions').reply(200, createSessionSuccessResponse)

      const ctpPaymentToTest = {
        amountPlanned: { centAmount: 100, currencyCode: 'EUR' },
        custom: {
          fields: {
            languageCode: 'nonExistingLanguageCode',
            createSessionRequest: JSON.stringify({
              reference: 'YOUR_REFERENCE',
            }),
            adyenMerchantAccount,
            commercetoolsProjectKey,
          },
        },
      }

      const response =
        await createLineItemsSessionPaymentHandler.execute(ctpPaymentToTest)
      const createSessionRequestInteraction = JSON.parse(
        response.actions.find((a) => a.action === 'addInterfaceInteraction')
          .fields.request,
      )
      const { lineItems } = JSON.parse(createSessionRequestInteraction.body)
      expect(lineItems[2].description).to.equal(
        ctpCart.shippingInfo.shippingMethodName,
      )
    },
  )

  it(
    'when custom shipping info is used in klarna payment,' +
      'it should return correct shipping name',
    async () => {
      const clonedCtpCart = _.cloneDeep(ctpCartWithCustomShippingMethod)
      _mockCtpCartsEndpoint(clonedCtpCart)
      scope.post('/payments').reply(200, createSessionSuccessResponse)

      const klarnacreateSessionRequest = {
        reference: 'YOUR_REFERENCE',
        paymentMethod: {
          type: 'klarna',
        },
      }

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.createSessionRequest = JSON.stringify(
        klarnacreateSessionRequest,
      )
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount
      ctpPaymentClone.custom.fields.commercetoolsProjectKey =
        commercetoolsProjectKey

      const response =
        await createLineItemsSessionPaymentHandler.execute(ctpPaymentClone)
      expect(response.actions).to.have.lengthOf(3)
      const createSessionRequestInteraction = JSON.parse(
        response.actions.find((a) => a.action === 'addInterfaceInteraction')
          .fields.request,
      )
      const { lineItems } = JSON.parse(createSessionRequestInteraction.body)
      const shippingMethodItem = lineItems[lineItems.length - 1]
      expect(shippingMethodItem.id).to.equal(
        ctpCartWithCustomShippingMethod.shippingInfo.shippingMethodName,
      )
      expect(shippingMethodItem.description).to.equal(
        ctpCartWithCustomShippingMethod.shippingInfo.shippingMethodName,
      )
      expect(shippingMethodItem.taxPercentage).to.equal(
        ctpCartWithCustomShippingMethod.shippingInfo.taxRate.amount * 10000,
      )
    },
  )

  it(
    'when custom shipping info is used in affirm payment,' +
      'it should return correct shipping name',
    async () => {
      const clonedCtpCart = _.cloneDeep(ctpCartWithCustomShippingMethod)
      _mockCtpCartsEndpoint(clonedCtpCart)
      scope.post('/payments').reply(200, createSessionSuccessResponse)

      const affirmcreateSessionRequest = {
        reference: 'YOUR_REFERENCE',
        paymentMethod: {
          type: 'affirm',
        },
      }

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.createSessionRequest = JSON.stringify(
        affirmcreateSessionRequest,
      )
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount
      ctpPaymentClone.custom.fields.commercetoolsProjectKey =
        commercetoolsProjectKey

      const response =
        await createLineItemsSessionPaymentHandler.execute(ctpPaymentClone)
      expect(response.actions).to.have.lengthOf(3)
      const createSessionRequestInteraction = JSON.parse(
        response.actions.find((a) => a.action === 'addInterfaceInteraction')
          .fields.request,
      )
      const { lineItems } = JSON.parse(createSessionRequestInteraction.body)
      const shippingMethodItem = lineItems[lineItems.length - 1]
      expect(shippingMethodItem.id).to.equal(
        ctpCartWithCustomShippingMethod.shippingInfo.shippingMethodName,
      )
      expect(shippingMethodItem.description).to.equal(
        ctpCartWithCustomShippingMethod.shippingInfo.shippingMethodName,
      )
      expect(shippingMethodItem.taxPercentage).to.equal(
        ctpCartWithCustomShippingMethod.shippingInfo.taxRate.amount * 10000,
      )
    },
  )

  it('when payment has languageCode, it should take precedence', async () => {
    const clonedCtpCart = _.cloneDeep(ctpCart)
    clonedCtpCart.lineItems[0].name = {
      de: 'test-de',
      fr: 'test-fr',
      at: 'test-at',
      en: 'test-en',
    }
    _mockCtpCartsEndpoint(clonedCtpCart)
    scope.post('/payments').reply(200, createSessionSuccessResponse)

    const ctpPaymentToTest = {
      amountPlanned: { centAmount: 100, currencyCode: 'EUR' },
      custom: {
        fields: {
          languageCode: 'de',
          createSessionRequest: JSON.stringify({ reference: 'YOUR_REFERENCE' }),
          adyenMerchantAccount,
          commercetoolsProjectKey,
        },
      },
    }
    const response =
      await createLineItemsSessionPaymentHandler.execute(ctpPaymentToTest)
    const createSessionRequestInteraction = JSON.parse(
      response.actions.find((a) => a.action === 'addInterfaceInteraction')
        .fields.request,
    )
    const { lineItems } = JSON.parse(createSessionRequestInteraction.body)
    expect(lineItems[0].description).to.equal('test-de')
  })

  it(
    'when payment has NO languageCode and cart has locale, ' +
      'it should take precedence',
    async () => {
      const clonedCtpCart = _.cloneDeep(ctpCart)
      clonedCtpCart.locale = 'fr'
      clonedCtpCart.lineItems[0].name = {
        de: 'test-de',
        fr: 'test-fr',
        at: 'test-at',
        en: 'test-en',
      }
      _mockCtpCartsEndpoint(clonedCtpCart)
      scope.post('/payments').reply(200, createSessionSuccessResponse)

      const ctpPaymentToTest = {
        amountPlanned: { centAmount: 100, currencyCode: 'EUR' },
        custom: {
          fields: {
            createSessionRequest: JSON.stringify({
              reference: 'YOUR_REFERENCE',
            }),
            adyenMerchantAccount,
            commercetoolsProjectKey,
          },
        },
      }
      const response =
        await createLineItemsSessionPaymentHandler.execute(ctpPaymentToTest)
      const createSessionRequestInteraction = JSON.parse(
        response.actions.find((a) => a.action === 'addInterfaceInteraction')
          .fields.request,
      )
      const { lineItems } = JSON.parse(createSessionRequestInteraction.body)
      expect(lineItems[0].description).to.equal('test-fr')
    },
  )

  it(
    'when payment has NO languageCode and cart has NO locale, ' +
      'it should should take the first locale in line item name',
    async () => {
      const clonedCtpCart = _.cloneDeep(ctpCart)
      clonedCtpCart.lineItems[0].name = {
        de: 'test-de',
        fr: 'test-fr',
        at: 'test-at',
        en: 'test-en',
      }
      _mockCtpCartsEndpoint(clonedCtpCart)
      scope.post('/payments').reply(200, createSessionSuccessResponse)

      const ctpPaymentToTest = {
        amountPlanned: { centAmount: 100, currencyCode: 'EUR' },
        custom: {
          fields: {
            createSessionRequest: JSON.stringify({
              reference: 'YOUR_REFERENCE',
            }),
            adyenMerchantAccount,
            commercetoolsProjectKey,
          },
        },
      }
      const response =
        await createLineItemsSessionPaymentHandler.execute(ctpPaymentToTest)
      const createSessionRequestInteraction = JSON.parse(
        response.actions.find((a) => a.action === 'addInterfaceInteraction')
          .fields.request,
      )
      const { lineItems } = JSON.parse(createSessionRequestInteraction.body)
      expect(lineItems[0].description).to.equal('test-de')
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
