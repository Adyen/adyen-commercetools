const { expect } = require('chai')

const iTSetUp = require('./integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp')
const {
  CTP_ADYEN_INTEGRATION,
  CTP_INTERACTION_TYPE_REFUND,
  CTP_PAYMENT_CUSTOM_TYPE_KEY,
} = require('../../src/config/constants')
const {
  createAddTransactionAction,
} = require('../../src/paymentHandler/payment-utils')

describe('::refund::', () => {
  let ctpClient

  beforeEach(async () => {
    ctpClient = ctpClientBuilder.get()
    await iTSetUp.cleanupCtpResources(ctpClient)
    await iTSetUp.initServerAndExtension({ ctpClient })
  })

  afterEach(async () => {
    await iTSetUp.stopRunningServers()
    await iTSetUp.cleanupCtpResources(ctpClient)
  })

  it(
    'given a payment with "charge success transaction" ' +
      'when multiple "refund initial transactions" are added ' +
      'then Adyen should response with [refund-received] for each transaction ' +
      'and payment should have "refund pending transactions"',
    async () => {
      const paymentDraft = {
        amountPlanned: {
          currencyCode: 'EUR',
          centAmount: 1000,
        },
        paymentMethodInfo: {
          paymentInterface: CTP_ADYEN_INTEGRATION,
        },
        custom: {
          type: {
            typeId: 'type',
            key: CTP_PAYMENT_CUSTOM_TYPE_KEY,
          },
          fields: {},
        },
        transactions: [
          {
            type: 'Charge',
            amount: {
              currencyCode: 'EUR',
              centAmount: 1000,
            },
            interactionId: '883592826488441K',
            state: 'Success',
          },
        ],
      }

      const { body: payment } = await ctpClient.create(
        ctpClient.builder.payments,
        paymentDraft
      )

      const { statusCode, body: refundPayment } = await ctpClient.update(
        ctpClient.builder.payments,
        payment.id,
        payment.version,
        [
          createAddTransactionAction({
            type: 'Refund',
            state: 'Initial',
            currency: 'EUR',
            amount: 500,
          }),
          createAddTransactionAction({
            type: 'Refund',
            state: 'Initial',
            currency: 'EUR',
            amount: 300,
          }),
          createAddTransactionAction({
            type: 'Refund',
            state: 'Initial',
            currency: 'EUR',
            amount: 100,
          }),
        ]
      )

      expect(statusCode).to.be.equal(200)

      expect(refundPayment.transactions).to.have.lengthOf(4)
      const refundTransactions = [
        refundPayment.transactions[1],
        refundPayment.transactions[2],
        refundPayment.transactions[3],
      ]
      for (const refundTransaction of refundTransactions) {
        expect(refundTransaction.type).to.equal('Refund')
        expect(refundTransaction.state).to.equal('Pending')
      }

      const interfaceInteractions = refundPayment.interfaceInteractions.filter(
        (interaction) => interaction.fields.type === CTP_INTERACTION_TYPE_REFUND
      )

      for (const interfaceInteraction of interfaceInteractions) {
        const adyenResponse = JSON.parse(interfaceInteraction.fields.response)
        expect(adyenResponse.response).to.equal('[refund-received]')
        const refundTransaction = refundTransactions.find(
          (transaction) =>
            transaction.interactionId === adyenResponse.pspReference
        )
        expect(refundTransaction).to.exist
      }
    }
  )

  it(
    'given a payment with "authorization success transaction" ' +
      'when multiple "refund initial transactions" are added ' +
      'then Adyen should response with [refund-received] for each transaction ' +
      'and payment should have "refund pending transactions"',
    async () => {
      const paymentDraft = {
        amountPlanned: {
          currencyCode: 'EUR',
          centAmount: 1000,
        },
        paymentMethodInfo: {
          paymentInterface: CTP_ADYEN_INTEGRATION,
        },
        custom: {
          type: {
            typeId: 'type',
            key: CTP_PAYMENT_CUSTOM_TYPE_KEY,
          },
          fields: {},
        },
        transactions: [
          {
            type: 'Authorization',
            amount: {
              currencyCode: 'EUR',
              centAmount: 1000,
            },
            interactionId: '883592826488441K',
            state: 'Success',
          },
        ],
      }

      const { body: payment } = await ctpClient.create(
        ctpClient.builder.payments,
        paymentDraft
      )

      const { statusCode, body: refundPayment } = await ctpClient.update(
        ctpClient.builder.payments,
        payment.id,
        payment.version,
        [
          createAddTransactionAction({
            type: 'Refund',
            state: 'Initial',
            currency: 'EUR',
            amount: 500,
          }),
          createAddTransactionAction({
            type: 'Refund',
            state: 'Initial',
            currency: 'EUR',
            amount: 300,
          }),
          createAddTransactionAction({
            type: 'Refund',
            state: 'Initial',
            currency: 'EUR',
            amount: 100,
          }),
        ]
      )

      expect(statusCode).to.be.equal(200)

      expect(refundPayment.transactions).to.have.lengthOf(4)
      const refundTransactions = [
        refundPayment.transactions[1],
        refundPayment.transactions[2],
        refundPayment.transactions[3],
      ]
      for (const refundTransaction of refundTransactions) {
        expect(refundTransaction.type).to.equal('Refund')
        expect(refundTransaction.state).to.equal('Pending')
      }

      const interfaceInteractions = refundPayment.interfaceInteractions.filter(
        (interaction) => interaction.fields.type === CTP_INTERACTION_TYPE_REFUND
      )

      for (const interfaceInteraction of interfaceInteractions) {
        const adyenResponse = JSON.parse(interfaceInteraction.fields.response)
        expect(adyenResponse.response).to.equal('[refund-received]')
        const refundTransaction = refundTransactions.find(
          (transaction) =>
            transaction.interactionId === adyenResponse.pspReference
        )
        expect(refundTransaction).to.exist
      }
    }
  )
})
