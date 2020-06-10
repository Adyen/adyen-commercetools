const { expect } = require('chai')

const iTSetUp = require('./integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp/ctp-client')
const {
  CTP_ADYEN_INTEGRATION, CTP_PAYMENT_CUSTOM_TYPE_KEY, CTP_INTERACTION_TYPE_CANCEL_OR_REFUND
} = require('../../src/config/constants')

describe('::manualCapture::', () => {
  let ctpClient

  let payment

  beforeEach(async () => {
    ctpClient = ctpClientBuilder.get()
    await iTSetUp.cleanupCtpResources(ctpClient)
    await iTSetUp.initServerAndExtension(ctpClient)
    const makePaymentRequestDraft = {
      amount: {
        currency: 'EUR',
        value: 500
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
        centAmount: 500,
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
    'then Adyen should response with [capture-received]', async () => {

    const { statusCode, body: updatedPayment } = await ctpClient.update(ctpClient.builder.payments,
      payment.id, payment.version, [
        {
          action: 'setCustomField',
          name: 'manualCaptureRequest',
          value: JSON.stringify({
            modificationAmount: {
              value: 550,
              currency: 'EUR'
            },
            originalReference: '8313547924770610',
            reference: 'YOUR_UNIQUE_REFERENCE'
          })
        }
      ])

    expect(statusCode).to.be.equal(200)


  })
})
