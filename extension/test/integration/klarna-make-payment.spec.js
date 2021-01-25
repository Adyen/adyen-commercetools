const { expect } = require('chai')

const ctpClientBuilder = require('../../src/ctp')
const iTSetUp = require('./integration-test-set-up')

describe('::makePayment::', () => {
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
    'given a payment,' +
      'when makePayment custom field is set with Klarna Adyen request without line items,' +
      'then it should calculate correct line items for Klarna Adyen',
    async () => {
      const payment = await iTSetUp.initPaymentWithCart(ctpClient)
      const makePaymentRequestDraft = {
        riskData: {
          clientData:
            'eyJ2ZXJzaW9uIjoiMS4wLjAiLCJkZXZpY2VGaW5nZXJwcmludCI6ImRmLXRpbWVkT3V0In0=',
        },
        reference: 'YOUR_REFERENCE',
        paymentMethod: {
          type: 'klarna',
        },
        amount: {
          currency: 'EUR',
          value: 1000,
        },
        shopperLocale: 'de_DE',
        countryCode: 'DE',
        shopperEmail: 'youremail@email.com',
        shopperReference: 'YOUR_UNIQUE_SHOPPER_ID',
        returnUrl: 'https://www.yourshop.com/checkout/result',
      }

      const { statusCode, body: updatedPayment } = await ctpClient.update(
        ctpClient.builder.payments,
        payment.id,
        payment.version,
        [
          {
            action: 'setCustomField',
            name: 'makePaymentRequest',
            value: JSON.stringify(makePaymentRequestDraft),
          },
        ]
      )

      expect(statusCode).to.be.equal(200)
      const makePaymentInteraction =
        updatedPayment.interfaceInteractions[0].fields
      const makePaymentRequest = JSON.parse(makePaymentInteraction.request)
      const makePaymentResponse = JSON.parse(makePaymentInteraction.response)

      expect(makePaymentRequest.lineItems).to.have.lengthOf(3)
      expect(makePaymentResponse.resultCode).to.be.equal('RedirectShopper')
    }
  )
})
