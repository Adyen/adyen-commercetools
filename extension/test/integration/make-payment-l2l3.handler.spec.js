import { expect } from 'chai'
import ctpClientBuilder from '../../src/ctp.js'
import config from '../../src/config/config.js'
import constants from '../../src/config/constants.js'
import { initPaymentWithCart } from './integration-test-set-up.js'
import utils from '../../src/utils.js'

describe('::make-payment L2/L3 data validation::', () => {
  const [commercetoolsProjectKey] = config.getAllCtpProjectKeys()
  const [adyenMerchantAccount] = config.getAllAdyenMerchantAccounts()

  let ctpClient

  beforeEach(async () => {
    const ctpConfig = config.getCtpConfig(commercetoolsProjectKey)
    ctpClient = await ctpClientBuilder.get(ctpConfig)
  })

  it(
    'given a payment with cart containing line items and custom line items, ' +
      'when makePayment is executed for a scheme payment, ' +
      'then it should map and validate all L2/L3 enhancedSchemeData fields',
    async () => {
      const payment = await initPaymentWithCart({
        ctpClient,
        adyenMerchantAccount,
        commercetoolsProjectKey,
      })

      const makePaymentRequestDraft = {
        amount: {
          currency: 'EUR',
          value: 1000,
        },
        reference: `makePaymentL2L3-${new Date().getTime()}`,
        paymentMethod: {
          type: 'scheme',
          encryptedCardNumber: 'test_4111111111111111',
          encryptedExpiryMonth: 'test_03',
          encryptedExpiryYear: 'test_2030',
          encryptedSecurityCode: 'test_737',
        },
        returnUrl: 'https://your-company.com/',
        shopperEmail: 'test.customer@test.com',
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
        ],
      )

      expect(statusCode).to.equal(200)

      const ctpCart = await utils.readAndParseJsonFile(
        'test/integration/fixtures/ctp-cart.json',
      )

      const interfaceInteraction = updatedPayment.interfaceInteractions.find(
        (interaction) =>
          interaction.fields.type ===
          constants.CTP_INTERACTION_TYPE_MAKE_PAYMENT,
      )
      expect(interfaceInteraction).to.exist

      const makePaymentRequest = JSON.parse(interfaceInteraction.fields.request)
      const makePaymentRequestBody = JSON.parse(makePaymentRequest.body)

      expect(makePaymentRequestBody.additionalData).to.exist

      const additionalData = makePaymentRequestBody.additionalData

      expect(
        additionalData['enhancedSchemeData.destinationCountryCode'],
      ).to.equal(ctpCart.shippingAddress.country)
      expect(
        additionalData['enhancedSchemeData.destinationPostalCode'],
      ).to.equal(ctpCart.shippingAddress.postalCode)
      expect(additionalData['enhancedSchemeData.orderDate']).to.match(/^\d{6}$/)
      expect(additionalData['enhancedSchemeData.totalTaxAmount']).to.be.a(
        'number',
      )
      expect(additionalData['enhancedSchemeData.freightAmount']).to.be.a(
        'number',
      )

      const cartLineItemsLength =
        ctpCart.lineItems.length + ctpCart.customLineItems.length

      for (let i = 0; i < cartLineItemsLength; i++) {
        const lineNumber = i + 1

        expect(
          additionalData[
            `enhancedSchemeData.itemDetailLine${lineNumber}.quantity`
          ],
        ).to.be.a('number')
        expect(
          additionalData[
            `enhancedSchemeData.itemDetailLine${lineNumber}.quantity`
          ],
        ).to.be.greaterThan(0)
        expect(
          additionalData[
            `enhancedSchemeData.itemDetailLine${lineNumber}.totalAmount`
          ],
        ).to.be.a('number')
        expect(
          additionalData[
            `enhancedSchemeData.itemDetailLine${lineNumber}.unitPrice`
          ],
        ).to.be.a('number')
      }

      const { makePaymentResponse } = updatedPayment.custom.fields
      expect(makePaymentResponse).to.exist
      expect(JSON.parse(makePaymentResponse).resultCode).to.be.equal(
        'Authorised',
      )
    },
  )
})
