const {expect} = require('chai')

const iTSetUp = require('./integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp/ctp-client')
const { CTP_ADYEN_INTEGRATION, CTP_PAYMENT_CUSTOM_TYPE_KEY } = require('../../src/config/constants')

describe('::cancelOrRefund::', () => {
  let ctpClient

  let payment
  const reference = 'YOUR_ORDER_NUMBER'

  beforeEach(async () => {
    ctpClient = ctpClientBuilder.get()
    await iTSetUp.initServerAndExtension(ctpClient)

    const makePaymentRequestDraft = {
      amount: {
        currency: 'EUR',
        value: 1000
      },
      reference,
      paymentMethod: {
        type: 'scheme',
        encryptedCardNumber: 'test_4111111111111111',
        encryptedExpiryMonth: 'test_03',
        encryptedExpiryYear: 'test_2030',
        encryptedSecurityCode: 'test_737'
      },
      returnUrl: 'https://your-company.com/'
    }
    const paymentDraft = {
      amountPlanned: {
        currencyCode: 'EUR',
        centAmount: 1000,
      },
      paymentMethodInfo: {
        paymentInterface: CTP_ADYEN_INTEGRATION
      },
      custom: {
        type: {
          typeId: 'type',
          key: CTP_PAYMENT_CUSTOM_TYPE_KEY
        },
        fields: {
          makePaymentRequest: JSON.stringify(makePaymentRequestDraft)
        }
      }
    }

    const result = await ctpClient.create(ctpClient.builder.payments, paymentDraft)
    payment = result.body
  })

  afterEach(async () => {
    await iTSetUp.cleanupResources()
  })

  it('given a payment ' +
    'when a transaction with type "Refund" with "Initial" state, ' +
    'then it should issue a "/cancelOrRefund" request to Adyen ' +
    'and should modify "Initial" state to "Pending" of the "Refund" transaction', async () => {
    const actions = [
      {
        action: 'addTransaction',
        transaction: {
          type: 'Refund',
          amount: {
            currencyCode: payment.transactions[0].amount.currencyCode,
            centAmount: payment.transactions[0].amount.centAmount
          },
          state: 'Initial'
        }
      }
    ]
    const {body: refundedPayment} = await ctpClient.update(ctpClient.builder.payments,
      payment.id, payment.version, actions)

    expect(refundedPayment.transactions).to.have.lengthOf(2)
    const transaction = refundedPayment.transactions[1]
    expect(transaction.type).to.equal('Refund')
    expect(transaction.state).to.equal('Pending')

    // const interfaceInteraction = payment.interfaceInteractions
    //   .find(interaction => interaction.fields.type === c.CTP_INTERACTION_TYPE_CANCEL_OR_REFUND)
    // const adyenResponse = JSON.parse(interfaceInteraction.fields.response)
    // expect(adyenResponse.response).to.equal('[cancelOrRefund-received]')
  })
})
