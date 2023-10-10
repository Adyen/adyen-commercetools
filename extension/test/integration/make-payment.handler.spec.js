import { expect } from 'chai'
import ctpClientBuilder from '../../src/ctp.js'
import config from '../../src/config/config.js'
import constants from '../../src/config/constants.js'
import { initPaymentWithCart } from './integration-test-set-up.js'

describe('::make-payment with multiple adyen accounts use case::', () => {
  const [commercetoolsProjectKey] = config.getAllCtpProjectKeys()
  const [adyenMerchantAccount1, adyenMerchantAccount2] =
    config.getAllAdyenMerchantAccounts()

  let ctpClient

  beforeEach(async () => {
    const ctpConfig = config.getCtpConfig(commercetoolsProjectKey)
    ctpClient = await ctpClientBuilder.get(ctpConfig)
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
          reference: `makePayment1-${new Date().getTime()}`,
          adyenMerchantAccount: adyenMerchantAccount1,
          metadata: {
            orderNumber: `externalOrderSystem-12345`,
            receiptNumber: `externalOrderSystem-receipt123`,
          },
        }),
        makePayment({
          reference: `makePayment2-${new Date().getTime()}`,
          adyenMerchantAccount: adyenMerchantAccount2 || adyenMerchantAccount1,
        }),
      ])
    },
  )

  it(
    'given a payment with cart ' +
      'when makePayment custom field and the addCommercetoolsLineItems set to true ' +
      'then should calculate and lineItems to the makePaymentRequest',
    async () => {
      const payment = await initPaymentWithCart({
        ctpClient,
        adyenMerchantAccount: adyenMerchantAccount1,
        commercetoolsProjectKey,
      })

      const makePaymentRequestDraft = {
        amount: {
          currency: 'EUR',
          value: 1000,
        },
        reference: `makePayment3-${new Date().getTime()}`,
        paymentMethod: {
          type: 'scheme',
          encryptedCardNumber: 'test_4111111111111111',
          encryptedExpiryMonth: 'test_03',
          encryptedExpiryYear: 'test_2030',
          encryptedSecurityCode: 'test_737',
        },
        metadata: {
          orderNumber: `externalOrderSystem-12345`,
          receiptNumber: `externalOrderSystem-receipt123`,
        },
        returnUrl: 'https://your-company.com/',
        addCommercetoolsLineItems: true,
      }

      const { statusCode, body: updatedPayment } = await ctpClient.update(
        ctpClient.builder.payments,
        payment.id,
        payment.version,
        [
          {
            action: 'setCustomField',
            name: 'makePaymentRequest',
            value: JSON.stringify(makePaymentRequestDraft),
          },
        ],
      )

      const makePaymentResponse =
        updatedPayment?.custom?.fields?.makePaymentResponse
      const pspReference = JSON.parse(makePaymentResponse).pspReference
      expect(statusCode).to.equal(200)
      expect(updatedPayment.key).to.equal(pspReference)
      expect(updatedPayment.paymentMethodInfo.method).to.equal('scheme')
      expect(updatedPayment.paymentMethodInfo.name).to.eql({
        en: 'Credit Card',
      })

      const interfaceInteraction = updatedPayment.interfaceInteractions.find(
        (interaction) =>
          interaction.fields.type ===
          constants.CTP_INTERACTION_TYPE_MAKE_PAYMENT,
      )
      const makePaymentRequest = JSON.parse(interfaceInteraction.fields.request)
      const makePaymentRequestBody = JSON.parse(makePaymentRequest.body)
      expect(makePaymentRequestBody.lineItems).to.have.lengthOf(3)
    },
  )

  async function makePayment({ reference, adyenMerchantAccount, metadata }) {
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
      metadata,
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
      paymentDraft,
    )

    expect(statusCode).to.equal(201)
    const { makePaymentResponse } = payment.custom.fields
    const pspReference = JSON.parse(makePaymentResponse).pspReference
    expect(payment.key).to.equal(pspReference)
    expect(payment.paymentMethodInfo.method).to.equal('scheme')
    expect(payment.paymentMethodInfo.name).to.eql({ en: 'Credit Card' })

    const interfaceInteraction = payment.interfaceInteractions.find(
      (interaction) =>
        interaction.fields.type === constants.CTP_INTERACTION_TYPE_MAKE_PAYMENT,
    )
    const makePaymentRequest = JSON.parse(interfaceInteraction.fields.request)
    const makePaymentRequestBody = JSON.parse(makePaymentRequest.body)
    if (metadata) {
      expect(makePaymentRequestBody.metadata).to.deep.equal({
        ctProjectKey: commercetoolsProjectKey,
        ...metadata,
      })
    } else {
      expect(makePaymentRequestBody.metadata).to.deep.equal({
        ctProjectKey: commercetoolsProjectKey,
      })
    }

    expect(makePaymentRequestBody.merchantAccount).to.be.equal(
      adyenMerchantAccount,
    )

    expect(makePaymentResponse).to.be.deep.equal(
      interfaceInteraction.fields.response,
    )
    expect(JSON.parse(makePaymentResponse).resultCode).to.be.equal('Authorised')

    expect(payment.transactions).to.have.lengthOf(1)
    const transaction = payment.transactions[0]
    expect(transaction.state).to.be.equal('Success')
    expect(transaction.type).to.be.equal('Authorization')
    expect(transaction.amount.currencyCode).to.be.equal('EUR')
    expect(transaction.amount.centAmount).to.be.equal(
      paymentDraft.amountPlanned.centAmount,
    )
    expect(transaction.interactionId).to.be.a('string')
  }
})
