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
    await iTSetUp.initServerAndExtension({
      ctpClient,
      ctpProjectKey: ctpConfig.projectKey,
    })
  })

  afterEach(async () => {
    await iTSetUp.stopRunningServers()
    await iTSetUp.cleanupCtpResources(ctpClient)
  })

  it(
    'given a single commercetools project and payments ' +
      'when makePayment custom field is set and response from Adyen is Authorised, ' +
      'then it should connect the 2 different adyen mechant accounts and ' +
      'should set key, "makePaymentResponse" custom field, interface interactions ' +
      'and a successfully authorized transaction',
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

    const { statusCode, body: payment } = await ctpClient.create(
      ctpClient.builder.payments,
      paymentDraft
    )

    expect(statusCode).to.equal(201)

    expect(payment.key).to.equal(reference)

    const interfaceInteraction = payment.interfaceInteractions.find(
      (interaction) =>
        interaction.fields.type === constants.CTP_INTERACTION_TYPE_MAKE_PAYMENT
    )
    const makePaymentRequest = JSON.parse(interfaceInteraction.fields.request)
    expect(makePaymentRequest.metadata).to.deep.equal({
      ctProjectKey: commercetoolsProjectKey,
    })
    expect(makePaymentRequest.merchantAccount).to.be.equal(adyenMerchantAccount)

    const { makePaymentResponse } = payment.custom.fields

    expect(makePaymentResponse).to.be.deep.equal(
      interfaceInteraction.fields.response
    )
    expect(JSON.parse(makePaymentResponse).resultCode).to.be.equal('Authorised')

    expect(payment.transactions).to.have.lengthOf(1)
    const transaction = payment.transactions[0]
    expect(transaction.state).to.be.equal('Success')
    expect(transaction.type).to.be.equal('Authorization')
    expect(transaction.amount.currencyCode).to.be.equal('EUR')
    expect(transaction.amount.centAmount).to.be.equal(
      paymentDraft.amountPlanned.centAmount
    )
    expect(transaction.interactionId).to.be.a('string')
  }
})
