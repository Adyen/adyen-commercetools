import { expect } from 'chai'
import ctpClientBuilder from '../../src/ctp.js'
import config from '../../src/config/config.js'
import constants from '../../src/config/constants.js'
import VError from 'verror'

const { CTP_ADYEN_INTEGRATION, CTP_PAYMENT_CUSTOM_TYPE_KEY } = constants

describe('::make-donation use case::', () => {
  const [commercetoolsProjectKey] = config.getAllCtpProjectKeys()
  const [adyenMerchantAccount] = config.getAllAdyenMerchantAccounts()

  const configAdyen = config.getAdyenConfig(adyenMerchantAccount)

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

  async function updatePaymentDonationsWithRepeater(payment, ctpClient) {
    const maxRetry = 20
    let currentPayment = payment
    let currentVersion = payment.version
    let retryCount = 0
    let retryMessage
    const repeater = async () => {
      const currentPaymentResponse = await ctpClient.fetchById(
        ctpClient.builder.payments,
        currentPayment.id,
      )

      if (currentPaymentResponse?.body) {
        currentPayment = currentPaymentResponse.body
        currentVersion = currentPayment.version
      }

      try {
        const makeDonationRequest = {
          amount: {
            currency: 'EUR',
            value: 1000,
          },
          reference: `makeDonation-${new Date().getTime()}`,
          paymentMethod: {
            type: 'scheme',
          },
          returnUrl: 'https://your-company.com/',
          donationToken: payment.custom.fields.donationToken,
          donationOriginalPspReference: JSON.parse(
            payment.custom.fields.makePaymentResponse,
          ).pspReference,
          merchantAccount: payment.custom.fields.adyenMerchantAccount,
          donationAccount: configAdyen.donationAccount,
          shopperInteraction: 'ContAuth',
        }
        const { statusCode, body: updatedPayment } = await ctpClient.update(
          ctpClient.builder.payments,
          payment.id,
          currentVersion,
          [
            {
              action: 'setCustomField',
              name: 'donationRequest',
              value: JSON.stringify(makeDonationRequest),
            },
          ],
        )

        return {
          statusCode: statusCode,
          body: updatedPayment,
        }
      } catch (err) {
        if (err.statusCode !== 409) {
          const errMsg = `Unexpected error on payment update with ID: ${currentPayment.id}.`
          throw new VError(err, errMsg)
        }

        retryCount += 1
        if (retryCount > maxRetry) {
          retryMessage =
            'Got a concurrent modification error' +
            ` when updating payment with id "${currentPayment.id}".` +
            ` Version tried "${currentVersion}",` +
            ` currentVersion: "${err.body.errors[0].currentVersion}".`
          throw new VError(
            err,
            `${retryMessage} Won't retry again` +
              ` because of a reached limit ${maxRetry}` +
              ` max retries.)}`,
          )
        }

        const response = await ctpClient.fetchById(
          ctpClient.builder.payments,
          currentPayment.id,
        )

        if (response?.body) {
          currentPayment = response.body
          currentVersion = currentPayment.version
        }

        return await repeater()
      }
    }

    return await repeater()
  }

  it(
    'given a payment with cart ' +
      'when makePaymentRequest contains donationToken, ' +
      'then update transaction is triggered ' +
      'and donation is created on Adyen side',
    async () => {
      const makePaymentRequestDraft = {
        amount: {
          currency: 'EUR',
          value: 1000,
        },
        reference: `makePayment3-${new Date().getTime()}`,
        paymentMethod: {
          type: 'scheme',
          encryptedCardNumber: 'test_4111111111111111',
          encryptedExpiryMonth: 'test_03',
          encryptedExpiryYear: 'test_2030',
          encryptedSecurityCode: 'test_737',
        },
        metadata: {
          orderNumber: `externalOrderSystem-12345`,
          receiptNumber: `externalOrderSystem-receipt123`,
        },
        returnUrl: 'https://your-company.com/',
        shopperEmail: 'test.customer@test.com',
        shopperName: {
          firstName: 'Test',
          lastName: 'Customer',
        },
        billingAddress: {
          houseNumberOrName: '456',
          street: 'Straße der Pariser Kommune',
        },
      }

      const { body: updatedPayment1 } = await ctpClient.update(
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

      const result = await updatePaymentDonationsWithRepeater(
        updatedPayment1,
        ctpClient,
        console,
      )

      expect(result.statusCode).to.equal(200)

      const donationResponseRaw = result.body.custom.fields.donationResponse
      expect(donationResponseRaw).to.be.a('string').and.not.empty
      // eslint-disable-next-line no-unused-vars
      let donationResponse
      expect(() => {
        donationResponse = JSON.parse(donationResponseRaw)
      }).to.not.throw()
    },
  )
})
