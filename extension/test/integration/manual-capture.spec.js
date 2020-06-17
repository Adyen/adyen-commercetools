const { expect } = require('chai')

const iTSetUp = require('./integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp/ctp-client')
const {
  CTP_ADYEN_INTEGRATION, CTP_PAYMENT_CUSTOM_TYPE_KEY, CTP_INTERACTION_TYPE_MANUAL_CAPTURE
} = require('../../src/config/constants')

describe('::manualCapture::', () => {
  let ctpClient

  let payment

  beforeEach(async () => {
    ctpClient = ctpClientBuilder.get()
    await iTSetUp.cleanupCtpResources(ctpClient)
    await iTSetUp.initServerAndExtension({ ctpClient })
    const makePaymentRequestDraft = {
      amount: {
        currency: 'EUR',
        value: 1000
      },
      reference: 'YOUR_UNIQUE_REFERENCE',
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
    await iTSetUp.stopRunningServers()
    await iTSetUp.cleanupCtpResources(ctpClient)
  })

  it('given a payment ' +
    'when "manualCaptureRequest" custom field is set with valid request (with correct amount and references) ' +
    'then Adyen should response with [capture-received] ' +
    'and payment should has a "Charge" transaction with "Pending status"', async () => {
    const { statusCode, body: chargedPayment } = await ctpClient.update(ctpClient.builder.payments,
      payment.id, payment.version,
      [
        {
          action: 'setCustomField',
          name: 'manualCaptureRequest',
          value: JSON.stringify({
            modificationAmount: {
              value: 500,
              currency: 'EUR'
            },
            originalReference: payment.transactions[0].interactionId,
            reference: 'YOUR_UNIQUE_REFERENCE'
          })
        }
      ])

    expect(statusCode).to.be.equal(200)

    expect(chargedPayment.transactions).to.have.lengthOf(2)
    const transaction = chargedPayment.transactions[1]
    expect(transaction.type).to.equal('Charge')
    expect(transaction.state).to.equal('Pending')

    const interfaceInteraction = chargedPayment.interfaceInteractions
      .find(interaction => interaction.fields.type === CTP_INTERACTION_TYPE_MANUAL_CAPTURE)

    const adyenResponse = JSON.parse(interfaceInteraction.fields.response)
    expect(adyenResponse.response).to.equal('[capture-received]')
    expect(transaction.interactionId).to.equal(adyenResponse.pspReference)
  })
})
