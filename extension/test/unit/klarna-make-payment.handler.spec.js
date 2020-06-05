const nock = require('nock')
const { expect } = require('chai')
const _ = require('lodash')
const configLoader = require('../../src/config/config')
const { execute } = require('../../src/paymentHandler/klarna-make-payment.handler')
const paymentSuccessResponse = require('./fixtures/adyen-make-payment-success-response')
const ctpPayment = require('../fixtures/ctp-payment')
const ctpCart = require('./fixtures/ctp-cart')
const { ADYEN_PERCENTAGE_MINOR_UNIT } = require('../../src/config/klarna-constants')

describe('klarna-make-payment::execute', () => {
  const config = configLoader.load()
  let scope

  /* eslint-enable max-len */

  beforeEach(() => {
    scope = nock(`${config.adyen.apiBaseUrl}`)
  })

  it('when request does not contain lineItems, ' +
    'then it should add lineItems correctly', async () => {
    const ctpApiScope = nock(`${config.ctp.apiUrl}`)
    const ctpAuthScope = nock(`${config.ctp.authUrl}`)
    ctpAuthScope.post('/oauth/token')
      .reply(200, {
        access_token: 'xxx',
        token_type: 'Bearer',
        expires_in: 172800,
        scope: 'manage_project:xxx'
      })
    ctpApiScope
      .get('/adyen-integration-test/carts')
      .query(true)
      .reply(200, { results: [ctpCart] })

    scope.post('/payments')
      .reply(200, paymentSuccessResponse)

    const klarnaMakePaymentRequest = {
      paymentMethod: {
        type: 'klarna'
      }
    }

    const ctpPaymentClone = _.cloneDeep(ctpPayment)
    ctpPaymentClone.custom.fields.makePaymentRequest = JSON.stringify(klarnaMakePaymentRequest)

    const response = await execute(ctpPaymentClone)
    expect(response.actions).to.have.lengthOf(3)
    const makePaymentRequestInteraction = JSON.parse(
      response.actions.find(a => a.action === 'addInterfaceInteraction').fields.request
    )
    const ctpLineItem = ctpCart.lineItems[0]
    const adyenLineItem = makePaymentRequestInteraction.lineItems.find(item => item.id === 'test-product-sku-1')
    expect(ctpLineItem.price.value.centAmount).to.equal(adyenLineItem.amountIncludingTax)
    expect(ctpLineItem.taxRate.amount * ADYEN_PERCENTAGE_MINOR_UNIT).to.equal(adyenLineItem.taxPercentage)

    const ctpShippingInfo = ctpCart.shippingInfo
    const adyenShippingInfo = makePaymentRequestInteraction.lineItems
      .find(item => item.id === ctpShippingInfo.shippingMethodName)
    expect(ctpShippingInfo.price.centAmount).to.equal(adyenShippingInfo.amountIncludingTax)
    expect(ctpShippingInfo.taxRate.amount * ADYEN_PERCENTAGE_MINOR_UNIT)
      .to.equal(adyenShippingInfo.taxPercentage)
  })

  it('when request does contain lineItems, ' +
    'then it should not add lineItems', async () => {
    const ctpApiScope = nock(`${config.ctp.apiUrl}`)
    const ctpAuthScope = nock(`${config.ctp.authUrl}`)
    ctpAuthScope.post('/oauth/token')
      .reply(200, {
        access_token: 'xxx',
        token_type: 'Bearer',
        expires_in: 172800,
        scope: 'manage_project:xxx'
      })
    ctpApiScope
      .get('/adyen-integration-test/carts')
      .query(true)
      .reply(200, { results: [ctpCart] })

    scope.post('/payments')
      .reply(200, paymentSuccessResponse)

    const klarnaMakePaymentRequest = {
      paymentMethod: {
        type: 'klarna'
      },
      lineItems: []
    }

    const ctpPaymentClone = _.cloneDeep(ctpPayment)
    ctpPaymentClone.custom.fields.makePaymentRequest = JSON.stringify(klarnaMakePaymentRequest)

    const response = await execute(ctpPaymentClone)
    expect(response.actions).to.have.lengthOf(3)
    const makePaymentRequestInteraction = JSON.parse(
      response.actions.find(a => a.action === 'addInterfaceInteraction').fields.request
    )
    expect(makePaymentRequestInteraction.lineItems).to.deep.equal(klarnaMakePaymentRequest.lineItems)
  })
})
