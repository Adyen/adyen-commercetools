const { expect } = require('chai')

const ctpClientBuilder = require('../../src/ctp')
const config = require('../../src/config/config')
const iTSetUp = require('./integration-test-set-up')

describe('::affirmMakePayment with multiple projects use case::', () => {
  const [commercetoolsProjectKey1, commercetoolsProjectKey2] =
    config.getAllCtpProjectKeys()
  const [adyenMerchantAccount1] = config.getAllAdyenMerchantAccounts()

  let ctpClientProject1
  let ctpClientProject2
  iTSetUp.initCurrency('USD')

  beforeEach(async () => {
    const ctpConfig1 = config.getCtpConfig(commercetoolsProjectKey1)
    ctpClientProject1 = ctpClientBuilder.get(ctpConfig1)

    await iTSetUp.cleanupCtpResources(ctpClientProject1)

    const ctpConfig2 = config.getCtpConfig(commercetoolsProjectKey2)
    ctpClientProject2 = ctpClientBuilder.get(ctpConfig2)

    await iTSetUp.cleanupCtpResources(ctpClientProject2)
  })

  afterEach(async () => {
    await iTSetUp.cleanupCtpResources(ctpClientProject1)
    await iTSetUp.cleanupCtpResources(ctpClientProject2)
  })

  it(
    'given 2 different commercetools projects and payments with single Adyen merchant account, ' +
      'when makePayment custom field is set with Affirm Adyen request without line items,' +
      'then it should should calculate correct line items for Affirm Adyen',
    async () => {
      await Promise.all([
        makePayment({
          ctpClient: ctpClientProject1,
          adyenMerchantAccount: adyenMerchantAccount1,
          commercetoolsProjectKey: commercetoolsProjectKey1,
          reference: 'paymentFromMerchant1_'.concat(Date.now().toString()),
        }),
        makePayment({
          ctpClient: ctpClientProject2,
          adyenMerchantAccount: adyenMerchantAccount1,
          commercetoolsProjectKey: commercetoolsProjectKey2,
          reference: 'paymentFromMerchant2_'.concat(Date.now().toString()),
        }),
      ])
    }
  )

  async function makePayment({
    ctpClient,
    adyenMerchantAccount,
    commercetoolsProjectKey,
    reference,
  }) {
    const payment = await iTSetUp.initPaymentWithCart({
      ctpClient,
      adyenMerchantAccount,
      commercetoolsProjectKey,
    })
    const makePaymentRequestDraft = {
      riskData: {
        clientData:
          'eyJ2ZXJzaW9uIjoiMS4wLjAiLCJkZXZpY2VGaW5nZXJwcmludCI6ImRmLXRpbWVkT3V0In0=',
      },
      reference,
      paymentMethod: {
        type: 'affirm',
      },
      amount: {
        currency: 'USD',
        value: 1000,
      },
      countryCode: 'US',
      telephoneNumber: '+31612345678',
      billingAddress: {
        city: 'San Francisco',
        country: 'US',
        houseNumberOrName: '274',
        postalCode: '94107',
        stateOrProvince: 'CA',
        street: 'Brannan St.',
      },
      deliveryAddress: {
        city: 'San Francisco',
        country: 'US',
        houseNumberOrName: '274',
        postalCode: '94107',
        stateOrProvince: 'CA',
        street: 'Brannan St.',
      },
      shopperName: {
        firstName: 'Simon',
        lastName: 'Hopper',
      },
      channel: 'web',
      shopperEmail: 's.hopper@example.com',
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

    expect(makePaymentRequest.metadata).to.deep.equal({
      ctProjectKey: commercetoolsProjectKey,
    })
    expect(makePaymentRequest.merchantAccount).to.be.equal(adyenMerchantAccount)

    expect(makePaymentRequest.lineItems).to.have.lengthOf(3)
    expect(makePaymentResponse.resultCode).to.be.equal('RedirectShopper')
  }
})
