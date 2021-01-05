const { expect } = require('chai')

const iTSetUp = require('./integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp')
const {
  CTP_ADYEN_INTEGRATION,
  CTP_INTERACTION_TYPE_CANCEL_PAYMENT,
  CTP_PAYMENT_CUSTOM_TYPE_KEY,
} = require('../../src/config/constants')
const {
  createAddTransactionAction,
} = require('../../src/paymentHandler/payment-utils')

describe('::cancel::', () => {
  let ctpClient
  let payment

  beforeEach(async () => {
    ctpClient = ctpClientBuilder.get()
    await iTSetUp.cleanupCtpResources(ctpClient)
    await iTSetUp.initServerAndExtension({ ctpClient })
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

    const result = await ctpClient.create(
      ctpClient.builder.payments,
      paymentDraft
    )
    payment = result.body
  })

  afterEach(async () => {
    await iTSetUp.stopRunningServers()
    await iTSetUp.cleanupCtpResources(ctpClient)
  })

  it(
    'given a payment with "authorization success transaction" ' +
      'when a "CancelAuthorization initial transaction" is added ' +
      'then Adyen should respond with [cancel-received] for each transaction ' +
      'and payment should have "CancelAuthorization pending transaction',
    async () => {
      const { statusCode, body: cancelledPayment } = await ctpClient.update(
        ctpClient.builder.payments,
        payment.id,
        payment.version,
        [
          createAddTransactionAction({
            type: 'CancelAuthorization',
            state: 'Initial',
            currency: 'EUR',
            amount: 500,
          }),
        ]
      )

      expect(statusCode).to.be.equal(200)

      expect(cancelledPayment.transactions).to.have.lengthOf(2)
      const transaction = cancelledPayment.transactions[1]
      expect(transaction.type).to.equal('CancelAuthorization')
      expect(transaction.state).to.equal('Pending')

      const interfaceInteraction = cancelledPayment.interfaceInteractions.find(
        (interaction) =>
          interaction.fields.type === CTP_INTERACTION_TYPE_CANCEL_PAYMENT
      )

      const adyenResponse = JSON.parse(interfaceInteraction.fields.response)
      expect(adyenResponse.response).to.equal('[cancel-received]')
      expect(transaction.interactionId).to.equal(adyenResponse.pspReference)
    }
  )
})
