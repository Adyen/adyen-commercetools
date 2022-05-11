import { expect } from 'chai'
import _ from 'lodash'
import nock from 'nock'
import paymentSuccessResponse from './fixtures/adyen-make-payment-success-response.js'
import makeLineItemsPaymentHandler from '../../src/paymentHandler/make-lineitems-payment.handler.js'
import config from '../../src/config/config.js'
import utils from '../../src/utils.js'

describe('::Multitenancy::', async () => {
  let adyenApiScope
  let ctpApiScope
  const ctpProjectKey = `ctpProjectKey${Math.floor(Math.random() * 3) + 1}`
  const adyenMerchantAccount = `adyenMerchantAccount${
    Math.floor(Math.random() * 3) + 1
  }`
  const ctpPayment = await utils.readAndParseJsonFile(
    'test/unit/fixtures/ctp-payment.json'
  )
  const ctpCart = await utils.readAndParseJsonFile(
    'test/unit/fixtures/ctp-cart.json'
  )

  beforeEach(() => {
    const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
    adyenApiScope = nock(`${adyenConfig.apiBaseUrl}`)
    adyenApiScope.post('/payments').reply(200, paymentSuccessResponse)
  })

  it(
    'when config has multiple projects, ' +
      'extension should call the correct adyen and commercetools project',
    async () => {
      _mockCtpCartsEndpoint()
      adyenApiScope.post('/payments').reply(200, paymentSuccessResponse)

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
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount
      ctpPaymentClone.custom.fields.commercetoolsProjectKey = ctpProjectKey

      const response = await makeLineItemsPaymentHandler.execute(
        ctpPaymentClone
      )
      const adyenRequest = JSON.parse(
        response.actions.find((a) => a.action === 'addInterfaceInteraction')
          .fields.request
      )
      expect(adyenRequest.merchantAccount).to.equal(adyenMerchantAccount)
      expect(ctpApiScope.isDone()).to.be.true
    }
  )

  function _mockCtpCartsEndpoint(mockCart = ctpCart) {
    const ctpConfig = config.getCtpConfig(ctpProjectKey)
    ctpApiScope = nock(`${ctpConfig.apiUrl}`)
    const ctpAuthScope = nock(`${ctpConfig.authUrl}`)
    ctpAuthScope.post('/oauth/token').reply(200, {
      access_token: 'xxx',
      token_type: 'Bearer',
      expires_in: 172800,
      scope: 'manage_project:xxx',
    })
    ctpApiScope
      .get(`/${ctpProjectKey}/carts`)
      .query(true)
      .reply(200, { results: [mockCart] })
  }
})
