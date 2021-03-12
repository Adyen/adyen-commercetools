const { expect } = require('chai')

const ctpClientBuilder = require('../../src/ctp')
const config = require('../../src/config/config')
const constants = require('../../src/config/constants')
const iTSetUp = require('./integration-test-set-up')
const auth = require('../../src/validator/authentication')

describe(':: Test case for make-payment request with authentication process enabled ::', () => {
  const [commercetoolsProjectKey] = config.getAllCtpProjectKeys()
  const [
    adyenMerchantAccount1,
    adyenMerchantAccount2,
  ] = config.getAllAdyenMerchantAccounts()

  let ctpClient
  let originalCtpConfig
  let ctpConfig = config.getCtpConfig(commercetoolsProjectKey)

  beforeEach(async () => {
    originalCtpConfig = ctpConfig
    ctpClient = ctpClientBuilder.get(ctpConfig)
    await iTSetUp.cleanupCtpResources(ctpClient)
    await iTSetUp.overrideBasicAuthFlag(true)
    await iTSetUp.addAuthConfig(commercetoolsProjectKey, {
      scheme: 'basic',
      username: 'Aladdin',
      password: 'open sesame',
    })
  })

  afterEach(async () => {
    ctpConfig = originalCtpConfig
    await iTSetUp.stopRunningServers()
    await iTSetUp.cleanupCtpResources(ctpClient)
    await iTSetUp.overrideBasicAuthFlag(false)
    await iTSetUp.restoreCtpConfig(commercetoolsProjectKey)
  })

  it(
    'given a single commercetools project with enabled authorization for extenstion module and payments ' +
      'when sending payments with incorrect authorization header, ' +
      'then it should fail to authenticate ',
    async () => {
      await iTSetUp.initServerAndExtension({
        ctpClient,
        ctpProjectKey: ctpConfig.projectKey,
      })

      try {
        await Promise.all([
          makePayment({
            reference: 'paymentFromMerchant1',
            adyenMerchantAccount: adyenMerchantAccount1,
          }),
          makePayment({
            reference: 'paymentFromMerchant2',
            adyenMerchantAccount: adyenMerchantAccount2,
          }),
        ])
        expect.fail('This test should throw an error, but it did not')
      } catch (e) {
        expect(e.statusCode).to.equal(400)
        expect(e.message).to.equal('The request is unauthorized.')
      }
    }
  )

  it(
    'given a single commercetools project with enabled authorization for extenstion module and payments ' +
      'when sending payments with correct authorization header, ' +
      'then it should success to make payment ',
    async () => {
      const authHeaderValue = auth.generateBasicAuthorizationHeaderValue(
        ctpConfig.projectKey
      )

      await iTSetUp.initServerAndExtension({
        ctpClient,
        ctpProjectKey: ctpConfig.projectKey,
        authHeaderValue,
      })

      const response = await Promise.all([
        makePayment({
          reference: 'paymentFromMerchant1',
          adyenMerchantAccount: adyenMerchantAccount1,
        }),
        makePayment({
          reference: 'paymentFromMerchant2',
          adyenMerchantAccount: adyenMerchantAccount2,
        }),
      ])
      expect(response.length).to.equal(2)
      expect(response[0].statusCode).to.equal(201)
      expect(response[1].statusCode).to.equal(201)
      expect(response[0].body.key).to.equal('paymentFromMerchant1')
      expect(response[1].body.key).to.equal('paymentFromMerchant2')
    }
  )

  async function makePayment({ reference, adyenMerchantAccount }) {
    const makePaymentRequestDraft = {
      amount: {
        currency: 'EUR',
        value: 1000,
      },
      reference,
      paymentMethod: {
        type: 'scheme',
        encryptedCardNumber: 'test_4111111111111111',
        encryptedExpiryMonth: 'test_03',
        encryptedExpiryYear: 'test_2030',
        encryptedSecurityCode: 'test_737',
      },
      returnUrl: 'https://your-company.com/',
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
          makePaymentRequest: JSON.stringify(makePaymentRequestDraft),
          adyenMerchantAccount,
          commercetoolsProjectKey,
        },
      },
    }
    const response = await ctpClient.create(
      ctpClient.builder.payments,
      paymentDraft
    )
    return response
  }
})
