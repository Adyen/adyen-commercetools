const { expect } = require('chai')
const _ = require('lodash')
const nock = require('nock')
const ctpPayment = require('./fixtures/ctp-payment.json')
const ctpCart = require('./fixtures/ctp-cart')
const paymentSuccessResponse = require('./fixtures/adyen-make-payment-success-response')

// To override the config,
// the overriding must be done before all `require` that loads config.js file
process.env.ADYEN_INTEGRATION_CONFIG = JSON.stringify({
  commercetools: {
    ctpProjectKey1: {
      clientId: 'clientId',
      clientSecret: 'clientSecret',
      ensureResources: true
    },
    ctpProjectKey2: {
      clientId: 'clientId2',
      clientSecret: 'clientSecret2',
      ensureResources: true
    },
    ctpProjectKey3: {
      clientId: 'clientId3',
      clientSecret: 'clientSecret3',
      ensureResources: true
    }
  },
  adyen: {
    adyenMerchantAccount1: {
      apiKey: 'apiKey',
      clientKey: 'clientKey'
    },
    adyenMerchantAccount2: {
      apiKey: 'apiKey2',
      clientKey: 'clientKey2'
    },
    adyenMerchantAccount3: {
      apiKey: 'apiKey3',
      clientKey: 'clientKey3'
    }
  },
  logLevel: 'DEBUG',
})

const {
  execute,
} = require('../../src/paymentHandler/klarna-make-payment.handler')
const config = require('../../src/config/config')

describe('::Multitenancy::', () => {

  let adyenApiScope
  let ctpApiScope
  const ctpProjectKey = `ctpProjectKey${Math.floor(Math.random() * 3) + 1}`
  const adyenMerchantAccount = `adyenMerchantAccount${Math.floor(Math.random() * 3) + 1}`

  beforeEach(() => {
    const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
    adyenApiScope = nock(`${adyenConfig.apiBaseUrl}`)
    adyenApiScope.post('/payments').reply(200, paymentSuccessResponse)
  })

  it('when config has multiple projects, ' +
    'extension should call the correct adyen and commercetools project', async () => {
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

    const response = await execute(ctpPaymentClone)
    const adyenRequest = JSON.parse(response.actions.find(a => a.action === 'addInterfaceInteraction').fields.request)
    expect(adyenRequest.merchantAccount).to.equal(adyenMerchantAccount)
    expect(ctpApiScope.isDone()).to.be.true
  })

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
