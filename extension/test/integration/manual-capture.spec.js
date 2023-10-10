import { expect } from 'chai'
import crypto from 'crypto'
import ctpClientBuilder from '../../src/ctp.js'
import constants from '../../src/config/constants.js'
import { createAddTransactionAction } from '../../src/paymentHandler/payment-utils.js'
import config from '../../src/config/config.js'
import { overrideGenerateIdempotencyKeyConfig } from '../test-utils.js'

const {
  CTP_ADYEN_INTEGRATION,
  CTP_INTERACTION_TYPE_MANUAL_CAPTURE,
  CTP_PAYMENT_CUSTOM_TYPE_KEY,
} = constants

describe('::manualCapture::', () => {
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const commercetoolsProjectKey = config.getAllCtpProjectKeys()[0]
  const idempotencyKey = crypto.randomBytes(20).toString('hex')
  let ctpClient
  let payment

  beforeEach(async () => {
    const ctpConfig = config.getCtpConfig(commercetoolsProjectKey)
    ctpClient = await ctpClientBuilder.get(ctpConfig)
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
        fields: {
          adyenMerchantAccount,
          commercetoolsProjectKey,
        },
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
      paymentDraft,
    )
    payment = result.body
  })

  async function testGenerateIdempotencyKey(chargedPayment) {
    const { body: chargedPayment1 } = await ctpClient.update(
      ctpClient.builder.payments,
      chargedPayment.id,
      chargedPayment.version,
      [
        createAddTransactionAction({
          type: 'Charge',
          state: 'Initial',
          currency: 'EUR',
          amount: 100,
          custom: {
            type: {
              typeId: 'type',
              key: 'ctp-adyen-integration-transaction-payment-type',
            },
          },
        }),
      ],
    )

    const transaction1 = chargedPayment1.transactions[2]
    const interfaceInteraction1 = chargedPayment1.interfaceInteractions.filter(
      (interaction) =>
        interaction.fields.type === CTP_INTERACTION_TYPE_MANUAL_CAPTURE,
    )[1]
    const adyenRequest1 = JSON.parse(interfaceInteraction1.fields.request)
    expect(adyenRequest1.headers['Idempotency-Key']).to.equal(transaction1.id)
    const adyenResponse1 = JSON.parse(interfaceInteraction1.fields.response)
    expect(adyenResponse1.status).to.equal('received')
    expect(transaction1.interactionId).to.equal(adyenResponse1.pspReference)
  }

  it(
    'given a payment ' +
      'when "charge initial transaction" is added to the payment' +
      'then Adyen should response with [capture-received] ' +
      'and payment should has a "Charge" transaction with "Pending" status',
    async () => {
      overrideGenerateIdempotencyKeyConfig(true)

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
            custom: {
              type: {
                typeId: 'type',
                key: 'ctp-adyen-integration-transaction-payment-type',
              },
              fields: {
                idempotencyKey,
              },
            },
          }),
        ],
      )

      expect(statusCode).to.be.equal(200)

      expect(chargedPayment.transactions).to.have.lengthOf(2)
      const transaction = chargedPayment.transactions[1]
      expect(transaction.type).to.equal('Charge')
      expect(transaction.state).to.equal('Pending')

      const interfaceInteraction = chargedPayment.interfaceInteractions.find(
        (interaction) =>
          interaction.fields.type === CTP_INTERACTION_TYPE_MANUAL_CAPTURE,
      )

      const adyenRequest = JSON.parse(interfaceInteraction.fields.request)
      expect(adyenRequest.headers['Idempotency-Key']).to.equal(idempotencyKey)
      const adyenResponse = JSON.parse(interfaceInteraction.fields.response)
      expect(adyenResponse.status).to.equal('received')
      expect(transaction.interactionId).to.equal(adyenResponse.pspReference)

      await testGenerateIdempotencyKey(chargedPayment)
    },
  )
})
