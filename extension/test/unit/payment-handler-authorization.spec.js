import nock from 'nock'
import _ from 'lodash'
import sinon from 'sinon'
import { expect } from 'chai'
import paymentHandler from '../../src/paymentHandler/payment-handler.js'

import errorMessage from '../../src/validator/error-messages.js'
import config from '../../src/config/config.js'
import utils from '../../src/utils.js'

const { handlePayment } = paymentHandler

describe('payment-handler-authorization::execute', () => {
  let ctpPayment
  let scope

  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const ctpProjectKey = config.getAllCtpProjectKeys()[0]
  const adyenCredentials = config.getAdyenConfig(adyenMerchantAccount)
  const dummyModuleConfig = {
    basicAuth: true,
  }
  const dummyCtpConfig = {
    clientId: 'clientId',
    clientSecret: 'clientSecret',
    projectKey: 'ctpProjectKey1',
    apiUrl: 'https://api.europe-west1.gcp.commercetools.com',
    authUrl: 'https://auth.europe-west1.gcp.commercetools.com',
    authentication: {
      scheme: 'basic',
      username: 'Aladdin',
      password: 'open sesame',
    },
  }
  const createSessionRequest = {
    countryCode: 'DE',
    reference: 'UNIQUE_PAYMENT_REFERENCE',
    amount: {
      currency: 'EUR',
      value: 1000,
    },
  }

  const adyenGetSessionResponse = {
    amount: {
      currency: 'EUR',
      value: 1000,
    },
    countryCode: 'DE',
    expiresAt: '2022-12-24T13:35:16+02:00',
    id: 'CSD9CAC34EBAE225DD',
    reference: 'UNIQUE_PAYMENT_REFERENCE',
    sessionData: 'Ab02b4c...',
  }
  before(async () => {
    ctpPayment = await utils.readAndParseJsonFile(
      'test/unit/fixtures/ctp-payment.json',
    )
  })

  beforeEach(() => {
    scope = nock(`${adyenCredentials.apiBaseUrl}`)
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it(
    'when endpoint authorization is enabled and request is authorized' +
      'then it should call /sessions on Adyen',
    async () => {
      scope.post('/sessions').reply(200, adyenGetSessionResponse)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.createSessionRequest =
        JSON.stringify(createSessionRequest)
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount
      ctpPaymentClone.custom.fields.commercetoolsProjectKey = ctpProjectKey

      const sandbox = sinon.createSandbox()
      sandbox.stub(config, 'getModuleConfig').returns(dummyModuleConfig)
      sandbox.stub(config, 'getCtpConfig').returns(dummyCtpConfig)
      const response = await handlePayment(
        ctpPaymentClone,
        'Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==',
      )
      expect(response.actions).to.have.lengthOf.above(0)
      sandbox.restore()
    },
  )

  it(
    'when endpoint authorization is enabled and request contains no authorization header value' +
      'then it should fail to call /sessions on Adyen',
    async () => {
      scope.post('/sessions').reply(200, adyenGetSessionResponse)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.createSessionRequest =
        JSON.stringify(createSessionRequest)
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount
      ctpPaymentClone.custom.fields.commercetoolsProjectKey = ctpProjectKey

      const sandbox = sinon.createSandbox()
      sandbox.stub(config, 'getModuleConfig').returns(dummyModuleConfig)
      sandbox.stub(config, 'getCtpConfig').returns(dummyCtpConfig)
      const response = await handlePayment(ctpPaymentClone)

      expect(response.errors).to.have.lengthOf(1)
      expect(response.errors[0].message).to.equal(
        errorMessage.UNAUTHORIZED_REQUEST,
      )
      sandbox.restore()
    },
  )

  it(
    'when endpoint authorization is enabled and request is not authorized' +
      'then it should fail to call /sessions on Adyen',
    async () => {
      scope.post('/sessions').reply(200, adyenGetSessionResponse)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.createSessionRequest =
        JSON.stringify(createSessionRequest)
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount
      ctpPaymentClone.custom.fields.commercetoolsProjectKey = ctpProjectKey

      const sandbox = sinon.createSandbox()
      sandbox.stub(config, 'getModuleConfig').returns(dummyModuleConfig)
      sandbox.stub(config, 'getCtpConfig').returns(dummyCtpConfig)
      const response = await handlePayment(ctpPaymentClone, 'Basic xxxyyyzzz')

      expect(response.errors).to.have.lengthOf(1)
      expect(response.errors[0].message).to.equal(
        errorMessage.UNAUTHORIZED_REQUEST,
      )
      sandbox.restore()
    },
  )

  it(
    'when endpoint authorization is enabled, credential is given in request but not found in server config' +
      'then it should fail to call /sessions on Adyen',
    async () => {
      scope.post('/sessions').reply(200, adyenGetSessionResponse)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.createSessionRequest =
        JSON.stringify(createSessionRequest)
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount
      ctpPaymentClone.custom.fields.commercetoolsProjectKey = ctpProjectKey

      const sandbox = sinon.createSandbox()
      sandbox.stub(config, 'getModuleConfig').returns(dummyModuleConfig)

      await handlePayment(ctpPaymentClone, 'Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==')
      sandbox.restore()
    },
  )

  it(
    'when endpoint authorization is disabled and unauthorized request is sent' +
      'then it should call /sessions on Adyen',
    async () => {
      scope.post('/sessions').reply(200, adyenGetSessionResponse)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.createSessionRequest =
        JSON.stringify(createSessionRequest)
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount
      ctpPaymentClone.custom.fields.commercetoolsProjectKey = ctpProjectKey
      const response = await handlePayment(ctpPaymentClone, 'Basic xxxyyyzzz')

      expect(response.actions).to.have.lengthOf.above(0)
    },
  )
})
