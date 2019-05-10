const { expect } = require('chai')

const testUtils = require('../test-utils')
const iTSetUp = require('./integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp/ctp-client')

describe('Cancel or refund', () => {
  let ctpClient

  beforeEach(async () => {
    ctpClient = ctpClientBuilder.get()
    await iTSetUp.initServerAndExtension(ctpClient)
  })

  afterEach(async () => {
    await iTSetUp.cleanupResources(ctpClient)
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
    const chargeTransaction = payment.transactions[0]

    const response2 = await ctpClient.update(ctpClient.builder.payments,
      paymentId, paymentVersion, [
        {
          action: 'addTransaction',
          transaction: {
            type: 'Refund',
            amount: {
              currencyCode: chargeTransaction.amount.currencyCode,
              centAmount: chargeTransaction.amount.centAmount
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
    const adyenRequest = JSON.parse(interfaceInteractionFields.request)
    const adyenRequestBody = JSON.parse(adyenRequest.body)
    expect(adyenRequestBody.originalReference).to.equal(chargeTransaction.interactionId)

    const adyenResponse = JSON.parse(interfaceInteractionFields.response)
    expect(adyenResponse.response).to.equal('[cancelOrRefund-received]')
  })
})
