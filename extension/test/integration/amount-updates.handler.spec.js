import { expect } from 'chai'
import constants from '../../src/config/constants.js'
import config from '../../src/config/config.js'
import ctpClientBuilder from '../../src/ctp.js'

/**
 * Flow description: https://docs.adyen.com/online-payments/adjust-authorisation
 */
describe('::amount updates::', () => {
  const [commercetoolsProjectKey] = config.getAllCtpProjectKeys()
  const [adyenMerchantAccount1] = config.getAllAdyenMerchantAccounts()

  let ctpClient

  beforeEach(async () => {
    const ctpConfig = config.getCtpConfig(commercetoolsProjectKey)
    ctpClient = await ctpClientBuilder.get(ctpConfig)
  })

  it('should call amountUpdates endpoint', async () => {
    const randomNumber = new Date().getTime()
    // 1. make payment
    const payment = await makePayment({
      reference: `makePayment1-${new Date().getTime()}`,
      adyenMerchantAccount: adyenMerchantAccount1,
      metadata: {
        orderNumber: `externalOrderSystem-${randomNumber}`,
      },
    })
    // 2. Modify the authorisation
    const paymentPspReference = JSON.parse(
      payment.custom.fields.makePaymentResponse
    ).pspReference

    const amountUpdatesRequestDraft = {
      paymentPspReference,
      amount: {
        currency: 'EUR',
        value: 1010,
      },
      reason: 'DelayedCharge',
      reference: payment.key,
    }

    const { statusCode, body: updatedPayment } = await ctpClient.update(
      ctpClient.builder.payments,
      payment.id,
      payment.version,
      [
        {
          action: 'setCustomField',
          name: 'amountUpdatesRequest',
          value: JSON.stringify(amountUpdatesRequestDraft),
        },
      ]
    )
    expect(statusCode).to.equal(200)
    const amountUpdatesResponse = JSON.parse(updatedPayment.custom.fields.amountUpdatesResponse);
    expect(amountUpdatesResponse.status).to.equal('received')
    const amountUpdatesInterfaceInteractions = updatedPayment.interfaceInteractions
      .filter(ii => ii.fields.type === 'amountUpdates')
    expect(amountUpdatesInterfaceInteractions).to.have.lengthOf(1)
  })

  it('should extend the authorisation when amount is the same', async () => {
    const randomNumber = new Date().getTime()
    // 1. make payment
    const payment = await makePayment({
      reference: `makePayment1-${new Date().getTime()}`,
      adyenMerchantAccount: adyenMerchantAccount1,
      metadata: {
        orderNumber: `externalOrderSystem-${randomNumber}`,
      },
    })
    // 2. Modify the authorisation
    const paymentPspReference = JSON.parse(
      payment.custom.fields.makePaymentResponse
    ).pspReference

    const amountUpdatesRequestDraft = {
      paymentPspReference,
      amount: {
        currency: 'EUR',
        value: 1000,
      },
      reason: 'DelayedCharge',
      reference: payment.key,
    }

    const { statusCode, body: updatedPayment } = await ctpClient.update(
      ctpClient.builder.payments,
      payment.id,
      payment.version,
      [
        {
          action: 'setCustomField',
          name: 'amountUpdatesRequest',
          value: JSON.stringify(amountUpdatesRequestDraft),
        },
      ]
    )
    expect(statusCode).to.equal(200)
    const amountUpdatesResponse = JSON.parse(updatedPayment.custom.fields.amountUpdatesResponse);
    expect(amountUpdatesResponse.status).to.equal('received')
    const amountUpdatesInterfaceInteractions = updatedPayment.interfaceInteractions
      .filter(ii => ii.fields.type === 'amountUpdates')
    expect(amountUpdatesInterfaceInteractions).to.have.lengthOf(1)
  })

  it('should repeatedly update amount', async () => {
    const randomNumber = new Date().getTime()
    // 1. make payment
    const payment = await makePayment({
      reference: `makePayment1-${new Date().getTime()}`,
      adyenMerchantAccount: adyenMerchantAccount1,
      metadata: {
        orderNumber: `externalOrderSystem-${randomNumber}`,
      },
    })
    // 2. Modify the authorisation
    const paymentPspReference = JSON.parse(
      payment.custom.fields.makePaymentResponse
    ).pspReference

    const amountUpdatesRequestDraft = {
      paymentPspReference,
      amount: {
        currency: 'EUR',
        value: 1000,
      },
      reason: 'DelayedCharge',
      reference: payment.key,
    }

    let { body: { version } } = await ctpClient.update(
      ctpClient.builder.payments,
      payment.id,
      payment.version,
      [
        {
          action: 'setCustomField',
          name: 'amountUpdatesRequest',
          value: JSON.stringify(amountUpdatesRequestDraft),
        },
      ]
    )

    while (true) {
      try {
        const { statusCode, body: updatedPayment } = await ctpClient.update(
          ctpClient.builder.payments,
          payment.id,
          version,
          [
            {
              action: 'setCustomField',
              name: 'amountUpdatesResponse'
            },
            {
              action: 'setCustomField',
              name: 'amountUpdatesRequest',
              value: JSON.stringify(amountUpdatesRequestDraft),
            },
          ]
        )
        expect(statusCode).to.equal(200)
        const amountUpdatesResponse = JSON.parse(updatedPayment.custom.fields.amountUpdatesResponse);
        expect(amountUpdatesResponse.status).to.equal('received')

        const amountUpdatesInterfaceInteractions = updatedPayment.interfaceInteractions
          .filter(ii => ii.fields.type === 'amountUpdates')
        expect(amountUpdatesInterfaceInteractions).to.have.lengthOf(2)
        break
      } catch (e) {
        if (e.statusCode === 409) {
          const { body } = await ctpClient.fetchByKey(
            ctpClient.builder.payments,
            payment.key
          )
          version = body.version
        } else {
          throw e
        }
      }
    }
  })

  async function makePayment({ reference, adyenMerchantAccount, metadata }) {
    const makePaymentRequestDraft = {
      amount: {
        currency: 'EUR',
        value: 1000,
      },
      reference,
      paymentMethod: {
        type: 'scheme',
        encryptedCardNumber: 'test_4111111111111111',
        encryptedExpiryMonth: 'test_03',
        encryptedExpiryYear: 'test_2030',
        encryptedSecurityCode: 'test_737',
      },
      captureDelayHours: 2,
      metadata,
      returnUrl: 'https://your-company.com/',
      additionalData: {
        authorisationType: 'PreAuth',
      },
    }
    const paymentDraft = {
      amountPlanned: {
        currencyCode: 'EUR',
        centAmount: 1000,
      },
      paymentMethodInfo: {
        paymentInterface: constants.CTP_ADYEN_INTEGRATION,
      },
      custom: {
        type: {
          typeId: 'type',
          key: constants.CTP_PAYMENT_CUSTOM_TYPE_KEY,
        },
        fields: {
          makePaymentRequest: JSON.stringify(makePaymentRequestDraft),
          adyenMerchantAccount,
          commercetoolsProjectKey,
        },
      },
    }

    const { body: payment } = await ctpClient.create(
      ctpClient.builder.payments,
      paymentDraft
    )

    return payment
  }
})
