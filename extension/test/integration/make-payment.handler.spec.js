const { expect } = require('chai')

const ctpClientBuilder = require('../../src/ctp/ctp-client')
const iTSetUp = require('./integration-test-set-up')
const c = require('../../src/config/constants')

describe('::makePayment::', () => {
  let ctpClient

  beforeEach(async () => {
    ctpClient = ctpClientBuilder.get()
    await iTSetUp.initServerAndExtension(ctpClient)
  })

  afterEach(async () => {
    await iTSetUp.cleanupResources(ctpClient)
  })

  it('given a payment ' +
    'when makePayment custom field is set and response from Adyen is Authorised, ' +
    'then it should set custom field makePaymentResponse, add transaction,  add interface interactions', async () => {
    const makePaymentRequestDraft = {
      amount: {
        currency: 'USD',
        value: 1000
      },
      reference: 'testReference',
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
        paymentInterface: c.CTP_ADYEN_INTEGRATION
      },
      custom: {
        type: {
          typeId: 'type',
          key: c.CTP_PAYMENT_CUSTOM_TYPE_KEY
        },
        fields: {
          makePaymentRequest: JSON.stringify(makePaymentRequestDraft)
        }
      }
    }

    const { statusCode, body: payment } = await ctpClient.create(ctpClient.builder.payments, paymentDraft)

    expect(statusCode).to.equal(201)

    const { makePaymentResponse } = payment.custom.fields
    const interfaceInteraction = payment.interfaceInteractions
      .find(interaction => interaction.fields.type === c.CTP_INTERACTION_TYPE_MAKE_PAYMENT)
    expect(makePaymentResponse).to.be.deep.equal(interfaceInteraction.fields.response)
    expect(JSON.parse(makePaymentResponse).resultCode).to.be.equal('Authorised')

    expect(payment.transactions).to.have.lengthOf(1)
    const transaction = payment.transactions[0]
    expect(transaction.state).to.be.equal('Success')
    expect(transaction.type).to.be.equal('Authorization')
    expect(transaction.amount.currencyCode).to.be.equal('EUR')
    expect(transaction.amount.centAmount).to.be.equal(paymentDraft.amountPlanned.centAmount)
    expect(transaction.interactionId).to.be.a('string')
  })

  it('given a payment,' +
    'when makePayment custom field is set with Klarna Adyen request without line items,' +
    'then it should calculate correct line items for Klarna Adyen', async () => {
    const payment = await iTSetUp.initPaymentWithCart(ctpClient)
    const makePaymentRequestDraft = {
      riskData: {
        clientData: 'eyJ2ZXJzaW9uIjoiMS4wLjAiLCJkZXZpY2VGaW5nZXJwcmludCI6ImRmLXRpbWVkT3V0In0='
      },
      reference: 'Klarna Pay later',
      paymentMethod: {
        type: 'klarna'
      },
      amount: {
        currency: 'EUR',
        value: '8610'
      },
      shopperLocale: 'de_DE',
      countryCode: 'DE',
      shopperEmail: 'youremail@email.com',
      shopperReference: 'YOUR_UNIQUE_SHOPPER_ID',
      returnUrl: 'https://www.yourshop.com/checkout/result'
    }

    const { statusCode, body: updatedPayment } = await ctpClient.update(ctpClient.builder.payments,
      payment.id, payment.version, [
        {
          action: 'setCustomField',
          name: 'makePaymentRequest',
          value: JSON.stringify(makePaymentRequestDraft)
        }
      ])

    expect(statusCode).to.be.equal(200)
    const makePaymentInteraction = updatedPayment.interfaceInteractions[0].fields
    const makePaymentRequest = JSON.parse(makePaymentInteraction.request)
    const makePaymentResponse = JSON.parse(makePaymentInteraction.response)

    expect(makePaymentRequest.lineItems).to.have.lengthOf(3)
    expect(makePaymentResponse.resultCode).to.be.equal('RedirectShopper')
  })
})
