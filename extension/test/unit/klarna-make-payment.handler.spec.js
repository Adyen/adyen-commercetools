const nock = require('nock')
const { expect } = require('chai')
const _ = require('lodash')
const configLoader = require('../../src/config/config')
const {
  execute,
} = require('../../src/paymentHandler/klarna-make-payment.handler')
const paymentSuccessResponse = require('./fixtures/adyen-make-payment-success-response')
const ctpPayment = require('./fixtures/ctp-payment.json')
const ctpCart = require('./fixtures/ctp-cart')

describe('klarna-make-payment::execute', () => {
  const ADYEN_PERCENTAGE_MINOR_UNIT = 10000
  const DEFAULT_PAYMENT_LANGUAGE = 'en'
  const KLARNA_DEFAULT_LINE_ITEM_NAME = 'item'
  const config = configLoader.load()
  let scope

  /* eslint-enable max-len */
  beforeEach(() => {
    scope = nock(`${config.adyen.apiBaseUrl}`)
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it(
    'when request does not contain lineItems, ' +
      'then it should add lineItems correctly',
    async () => {
      _mockCtpCartsEndpoint()
      scope.post('/payments').reply(200, paymentSuccessResponse)

      const klarnaMakePaymentRequest = {
        reference: 'YOUR_REFERENCE',
        paymentMethod: {
          type: 'klarna',
        },
      }

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.makePaymentRequest = JSON.stringify(
        klarnaMakePaymentRequest
      )

      const response = await execute(ctpPaymentClone)
      expect(response.actions).to.have.lengthOf(4)
      const makePaymentRequestInteraction = JSON.parse(
        response.actions.find((a) => a.action === 'addInterfaceInteraction')
          .fields.request
      )
      const ctpLineItem = ctpCart.lineItems[0]
      const adyenLineItem = makePaymentRequestInteraction.lineItems.find(
        (item) => item.id === 'test-product-sku-1'
      )
      expect(ctpLineItem.price.value.centAmount).to.equal(
        adyenLineItem.amountIncludingTax
      )
      expect(ctpLineItem.taxRate.amount * ADYEN_PERCENTAGE_MINOR_UNIT).to.equal(
        adyenLineItem.taxPercentage
      )

      const ctpShippingInfo = ctpCart.shippingInfo
      const adyenShippingInfo = makePaymentRequestInteraction.lineItems.find(
        (item) => item.id === ctpShippingInfo.shippingMethodName
      )
      expect(ctpShippingInfo.price.centAmount).to.equal(
        adyenShippingInfo.amountIncludingTax
      )
      expect(
        ctpShippingInfo.taxRate.amount * ADYEN_PERCENTAGE_MINOR_UNIT
      ).to.equal(adyenShippingInfo.taxPercentage)
    }
  )

  it(
    'when request does contain lineItems, ' +
      'then it should not add lineItems',
    async () => {
      _mockCtpCartsEndpoint()

      scope.post('/payments').reply(200, paymentSuccessResponse)

      const klarnaMakePaymentRequest = {
        reference: 'YOUR_REFERENCE',
        paymentMethod: {
          type: 'klarna',
        },
        lineItems: [],
      }

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.makePaymentRequest = JSON.stringify(
        klarnaMakePaymentRequest
      )

      const response = await execute(ctpPaymentClone)
      expect(response.actions).to.have.lengthOf(4)
      const makePaymentRequestInteraction = JSON.parse(
        response.actions.find((a) => a.action === 'addInterfaceInteraction')
          .fields.request
      )
      expect(makePaymentRequestInteraction.lineItems).to.deep.equal(
        klarnaMakePaymentRequest.lineItems
      )
    }
  )

  it(
    'when locale is not existing, ' +
      'it should fall back to default line item name',
    async () => {
      _mockCtpCartsEndpoint()
      scope.post('/payments').reply(200, paymentSuccessResponse)

      const ctpPaymentToTest = {
        amountPlanned: { centAmount: 100, currencyCode: 'EUR' },
        custom: {
          fields: {
            languageCode: 'nonExistingLanguageCode',
            makePaymentRequest: JSON.stringify({ reference: 'YOUR_REFERENCE' }),
          },
        },
      }
      const response = await execute(ctpPaymentToTest)
      const { lineItems } = JSON.parse(
        response.actions.find((a) => a.action === 'addInterfaceInteraction')
          .fields.request
      )
      expect(lineItems).to.have.lengthOf(3)
      expect(lineItems[0].description).to.equal(KLARNA_DEFAULT_LINE_ITEM_NAME)
      expect(lineItems[1].description).to.equal(
        ctpCart.customLineItems[0].name[DEFAULT_PAYMENT_LANGUAGE]
      )
      expect(lineItems[2].description).to.equal(
        ctpCart.shippingInfo.shippingMethod.obj.description
      )
    }
  )

  it(
    'when shipping info is not expanded, ' +
      'it should return default shipping name',
    async () => {
      const clonedCtpCart = _.cloneDeep(ctpCart)
      delete clonedCtpCart.shippingInfo.shippingMethod.obj
      _mockCtpCartsEndpoint(clonedCtpCart)
      scope.post('/payments').reply(200, paymentSuccessResponse)

      const ctpPaymentToTest = {
        amountPlanned: { centAmount: 100, currencyCode: 'EUR' },
        custom: {
          fields: {
            languageCode: 'nonExistingLanguageCode',
            makePaymentRequest: JSON.stringify({ reference: 'YOUR_REFERENCE' }),
          },
        },
      }

      const response = await execute(ctpPaymentToTest)
      const { lineItems } = JSON.parse(
        response.actions.find((a) => a.action === 'addInterfaceInteraction')
          .fields.request
      )
      expect(lineItems[2].description).to.equal(
        ctpCart.shippingInfo.shippingMethodName
      )
    }
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
    scope.post('/payments').reply(200, paymentSuccessResponse)

    const ctpPaymentToTest = {
      amountPlanned: { centAmount: 100, currencyCode: 'EUR' },
      custom: {
        fields: {
          languageCode: 'de',
          makePaymentRequest: JSON.stringify({ reference: 'YOUR_REFERENCE' }),
        },
      },
    }
    const response = await execute(ctpPaymentToTest)
    const { lineItems } = JSON.parse(
      response.actions.find((a) => a.action === 'addInterfaceInteraction')
        .fields.request
    )
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
      scope.post('/payments').reply(200, paymentSuccessResponse)

      const ctpPaymentToTest = {
        amountPlanned: { centAmount: 100, currencyCode: 'EUR' },
        custom: {
          fields: {
            makePaymentRequest: JSON.stringify({ reference: 'YOUR_REFERENCE' }),
          },
        },
      }
      const response = await execute(ctpPaymentToTest)
      const { lineItems } = JSON.parse(
        response.actions.find((a) => a.action === 'addInterfaceInteraction')
          .fields.request
      )
      expect(lineItems[0].description).to.equal('test-fr')
    }
  )

  it(
    'when payment has NO languageCode and cart has NO locale, ' +
      'it should fall back to default language',
    async () => {
      const clonedCtpCart = _.cloneDeep(ctpCart)
      clonedCtpCart.lineItems[0].name = {
        de: 'test-de',
        fr: 'test-fr',
        at: 'test-at',
        en: 'test-en',
      }
      _mockCtpCartsEndpoint(clonedCtpCart)
      scope.post('/payments').reply(200, paymentSuccessResponse)

      const ctpPaymentToTest = {
        amountPlanned: { centAmount: 100, currencyCode: 'EUR' },
        custom: {
          fields: {
            makePaymentRequest: JSON.stringify({ reference: 'YOUR_REFERENCE' }),
          },
        },
      }
      const response = await execute(ctpPaymentToTest)
      const { lineItems } = JSON.parse(
        response.actions.find((a) => a.action === 'addInterfaceInteraction')
          .fields.request
      )
      expect(lineItems[0].description).to.equal('test-en')
    }
  )

  function _mockCtpCartsEndpoint(mockCart = ctpCart) {
    const ctpApiScope = nock(`${config.ctp.apiUrl}`)
    const ctpAuthScope = nock(`${config.ctp.authUrl}`)
    ctpAuthScope.post('/oauth/token').reply(200, {
      access_token: 'xxx',
      token_type: 'Bearer',
      expires_in: 172800,
      scope: 'manage_project:xxx',
    })
    ctpApiScope
      .get(`/${config.ctp.projectKey}/carts`)
      .query(true)
      .reply(200, { results: [mockCart] })
  }
})
