const { expect } = require('chai')

const ctpClientBuilder = require('../../src/ctp')
const config = require('../../src/config/config')
const constants = require('../../src/config/constants')
const iTSetUp = require('./integration-test-set-up')

describe('::make-payment with multiple adyen accounts use case::', () => {
  const [commercetoolsProjectKey] = config.getAllCtpProjectKeys()
  const [
    adyenMerchantAccount1,
    adyenMerchantAccount2,
  ] = config.getAllAdyenMerchantAccounts()

  let ctpClient

  beforeEach(async () => {
    const ctpConfig = config.getCtpConfig(commercetoolsProjectKey)
    ctpClient = ctpClientBuilder.get(ctpConfig)
    await iTSetUp.cleanupCtpResources(ctpClient)
    await iTSetUp.initServerAndExtension(
      {
        ctpClient,
        ctpProjectKey: ctpConfig.projectKey,
      },
      true
    )
  })

  afterEach(async () => {
    await iTSetUp.stopRunningServers()
    await iTSetUp.cleanupCtpResources(ctpClient)
  })

  it(
    'given a single commercetools project without extension module authorization and payments ' +
      'when sending payment to extension module which enabled authentication, ' +
      'then it should fail to authenticate ',
    async () => {
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
    try {
      await ctpClient.create(ctpClient.builder.payments, paymentDraft)
      expect.fail('This test should throw an error, but it did not')
    } catch (e) {
      expect(e.statusCode).to.equal(400)
      expect(e.message).to.equal('The request is unauthorized.')
    }
  }
})
