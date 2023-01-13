import { expect } from 'chai'
import constants from '../../src/config/constants.js'
import config from '../../src/config/config.js'
import ctpClientBuilder from '../../src/ctp.js'

describe('disable stored payment', () => {
  const [commercetoolsProjectKey] = config.getAllCtpProjectKeys()
  const [adyenMerchantAccount] = config.getAllAdyenMerchantAccounts()

  let ctpClient

  beforeEach(async () => {
    const ctpConfig = config.getCtpConfig(commercetoolsProjectKey)
    ctpClient = await ctpClientBuilder.get(ctpConfig)
  })

  it.skip('should disable stored one-off payment when correct request is sent', async () => {
    const currentTime = new Date().getTime()
    const shopperReference = `makePayment1-shopperReference-${currentTime}`
    const payment = await createOneOffPayment({
      reference: `makePayment1-reference-${currentTime}`,
      shopperReference,
    })

    const makePaymentResponseJson = JSON.parse(
      payment.custom.fields.makePaymentResponse
    )

    // TODO : Check with Adyen support how to obtain recurringDetailReference in web component 5
    const recurringDetailReference =
      makePaymentResponseJson.additionalData[
        'recurring.recurringDetailReference'
      ]

    const disablePaymentRequestPayment =
      await createDisablePaymentRequestPayment({
        shopperReference,
        recurringDetailReference,
      })

    expect(
      disablePaymentRequestPayment.custom.fields.disableStoredPaymentResponse
    ).to.be.equal('{"response":"[detail-successfully-disabled]"}')
  })

  it.skip('should disable stored subscriptions payment when correct request is sent', async () => {
    const currentTime = new Date().getTime()
    const shopperReference = `makePayment1-shopperReference-${currentTime}`
    const payment = await createSubscriptionsPayment({
      reference: `makePayment1-reference-${currentTime}`,
      shopperReference,
    })

    const makePaymentResponseJson = JSON.parse(
      payment.custom.fields.makePaymentResponse
    )

    // TODO : Check with Adyen support how to obtain recurringDetailReference in web component 5
    const recurringDetailReference =
      makePaymentResponseJson.additionalData[
        'recurring.recurringDetailReference'
      ]

    const disablePaymentRequestPayment =
      await createDisablePaymentRequestPayment({
        shopperReference,
        recurringDetailReference,
      })

    expect(
      disablePaymentRequestPayment.custom.fields.disableStoredPaymentResponse
    ).to.be.equal('{"response":"[detail-successfully-disabled]"}')
  })

  it.skip('should disable automatic top-up payment when correct request is sent', async () => {
    const currentTime = new Date().getTime()
    const shopperReference = `makePayment1-shopperReference-${currentTime}`
    const payment = await createAutomaticTopUpPayment({
      reference: `makePayment1-reference-${currentTime}`,
      shopperReference,
    })

    const makePaymentResponseJson = JSON.parse(
      payment.custom.fields.makePaymentResponse
    )

    // TODO : Check with Adyen support how to obtain recurringDetailReference in web component 5
    const recurringDetailReference =
      makePaymentResponseJson.additionalData[
        'recurring.recurringDetailReference'
      ]

    const disablePaymentRequestPayment =
      await createDisablePaymentRequestPayment({
        shopperReference,
        recurringDetailReference,
      })

    expect(
      disablePaymentRequestPayment.custom.fields.disableStoredPaymentResponse
    ).to.be.equal('{"response":"[detail-successfully-disabled]"}')
  })

  async function createOneOffPayment({ reference, shopperReference }) {
    return await makePayment({
      reference,
      shopperReference,
      recurringProcessingModel: 'CardOnFile',
    })
  }

  async function createSubscriptionsPayment({ reference, shopperReference }) {
    return await makePayment({
      reference,
      shopperReference,
      recurringProcessingModel: 'Subscription',
    })
  }

  async function createAutomaticTopUpPayment({ reference, shopperReference }) {
    return await makePayment({
      reference,
      shopperReference,
      recurringProcessingModel: 'UnscheduledCardOnFile',
    })
  }

  async function makePayment({
    reference,
    shopperReference,
    recurringProcessingModel,
  }) {
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
      storePaymentMethod: true,
      shopperReference,
      shopperInteraction: 'Ecommerce',
      recurringProcessingModel,
      returnUrl: 'https://your-company.com/',
      removeSensitiveData: false,
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

    const { body: payment } = await ctpClient.create(
      ctpClient.builder.payments,
      paymentDraft
    )

    return payment
  }

  async function createDisablePaymentRequestPayment({
    shopperReference,
    recurringDetailReference,
  }) {
    const disableStoredPaymentRequestDraft = {
      shopperReference,
      recurringDetailReference,
    }

    const paymentDraft = {
      amountPlanned: {
        currencyCode: 'EUR',
        centAmount: 0,
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
          disableStoredPaymentRequest: JSON.stringify(
            disableStoredPaymentRequestDraft
          ),
          adyenMerchantAccount,
          commercetoolsProjectKey,
        },
      },
    }

    const { body: payment } = await ctpClient.create(
      ctpClient.builder.payments,
      paymentDraft
    )

    return payment
  }
})
