const { expect } = require('chai')

const testUtils = require('../test-utils')
const iTSetUp = require('./integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp/ctp-client')

describe.skip('Cancel or refund', () => {
  let ctpClient

  beforeEach(async () => {
    ctpClient = ctpClientBuilder.get()
    await iTSetUp.initServerAndExtension(ctpClient)
  })

  afterEach(async () => {
    await iTSetUp.cleanupResources()
  })

  it('should process a refund request', async () => {
    const paymentDraft = testUtils.createCreditCardPaymentDraft({
      cardNumber: '4111111145551142',
      cvc: '737',
      expiryMonth: '10',
      expiryYear: '2020'
    })
    const response = await ctpClient.create(ctpClient.builder.payments, JSON.parse(paymentDraft))
    const payment = response.body
    const paymentId = payment.id
    const paymentVersion = payment.version
    const transaction = payment.transactions[0]

    const response2 = await ctpClient.update(ctpClient.builder.payments,
      paymentId, paymentVersion, [
        {
          action: 'addTransaction',
          transaction: {
            type: 'Refund',
            amount: {
              currencyCode: transaction.amount.currencyCode,
              centAmount: transaction.amount.centAmount
            },
            state: 'Initial'
          }
        }
      ])

    expect(response2.statusCode).to.equal(200)
    const updatedPayment = response2.body
    const refundTransaction = updatedPayment.transactions[1]
    expect(refundTransaction.type).to.equal('Refund')
    expect(refundTransaction.state).to.equal('Pending')

    const interfaceInteractionFields = updatedPayment.interfaceInteractions[1].fields
    // interfaceInteractionFields.request is a stringify json
    const adyenRequestBody = JSON.parse(JSON.parse(interfaceInteractionFields.request))
    expect(adyenRequestBody.originalReference).to.equal(transaction.interactionId)

    const adyenResponse = JSON.parse(interfaceInteractionFields.response)
    expect(adyenResponse.response).to.equal('[cancelOrRefund-received]')
    expect(adyenResponse.additionalData).to.not.exist
  })
})
