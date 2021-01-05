const { expect } = require('chai')

const iTSetUp = require('./integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp')
const {
  CTP_ADYEN_INTEGRATION,
  CTP_INTERACTION_TYPE_MANUAL_CAPTURE,
  CTP_PAYMENT_CUSTOM_TYPE_KEY,
} = require('../../src/config/constants')
const {
  createAddTransactionAction,
} = require('../../src/paymentHandler/payment-utils')

describe('::manualCapture::', () => {
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
    'given a payment ' +
      'when "charge initial transaction" is added to the payment' +
      'then Adyen should response with [capture-received] ' +
      'and payment should has a "Charge" transaction with "Pending" status',
    async () => {
      const { statusCode, body: chargedPayment } = await ctpClient.update(
        ctpClient.builder.payments,
        payment.id,
        payment.version,
        [
          createAddTransactionAction({
            type: 'Charge',
            state: 'Initial',
            currency: 'EUR',
            amount: 500,
          }),
        ]
      )

      expect(statusCode).to.be.equal(200)

      expect(chargedPayment.transactions).to.have.lengthOf(2)
      const transaction = chargedPayment.transactions[1]
      expect(transaction.type).to.equal('Charge')
      expect(transaction.state).to.equal('Pending')

      const interfaceInteraction = chargedPayment.interfaceInteractions.find(
        (interaction) =>
          interaction.fields.type === CTP_INTERACTION_TYPE_MANUAL_CAPTURE
      )

      const adyenResponse = JSON.parse(interfaceInteraction.fields.response)
      expect(adyenResponse.response).to.equal('[capture-received]')
      expect(transaction.interactionId).to.equal(adyenResponse.pspReference)
    }
  )
})
