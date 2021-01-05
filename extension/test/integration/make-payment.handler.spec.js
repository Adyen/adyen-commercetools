const { expect } = require('chai')

const ctpClientBuilder = require('../../src/ctp')
const iTSetUp = require('./integration-test-set-up')
const c = require('../../src/config/constants')

describe('::makePayment::', () => {
  let ctpClient

  beforeEach(async () => {
    ctpClient = ctpClientBuilder.get()
    await iTSetUp.initServerAndExtension({ ctpClient })
  })

  afterEach(async () => {
    await iTSetUp.stopRunningServers()
  })

  it(
    'given a payment ' +
      'when makePayment custom field is set and response from Adyen is Authorised, ' +
      'then it should set key, "makePaymentResponse" custom field, interface interactions ' +
      'and a successfully authorized transaction',
    async () => {
      const makePaymentRequestDraft = {
        amount: {
          currency: 'EUR',
          value: 1000,
        },
        reference: 'YOUR_REFERENCE',
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
          paymentInterface: c.CTP_ADYEN_INTEGRATION,
        },
        custom: {
          type: {
            typeId: 'type',
            key: c.CTP_PAYMENT_CUSTOM_TYPE_KEY,
          },
          fields: {
            makePaymentRequest: JSON.stringify(makePaymentRequestDraft),
          },
        },
      }

      const { statusCode, body: payment } = await ctpClient.create(
        ctpClient.builder.payments,
        paymentDraft
      )

      expect(statusCode).to.equal(201)

      expect(payment.key).to.equal(makePaymentRequestDraft.reference)

      const { makePaymentResponse } = payment.custom.fields
      const interfaceInteraction = payment.interfaceInteractions.find(
        (interaction) =>
          interaction.fields.type === c.CTP_INTERACTION_TYPE_MAKE_PAYMENT
      )
      expect(makePaymentResponse).to.be.deep.equal(
        interfaceInteraction.fields.response
      )
      expect(JSON.parse(makePaymentResponse).resultCode).to.be.equal(
        'Authorised'
      )

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
  )
})
