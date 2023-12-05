import { expect } from 'chai'
import { withPayment } from '../../src/validator/validator-builder.js'
import errorMessages from '../../src/validator/error-messages.js'

const {
  CREATE_SESSION_REQUEST_INVALID_JSON,
  CREATE_SESSION_AMOUNT_PLANNED_NOT_SAME,
  CREATE_SESSION_REQUEST_MISSING_REFERENCE,
  MISSING_REQUIRED_FIELDS_ADYEN_MERCHANT_ACCOUNT,
  MISSING_REQUIRED_FIELDS_CTP_PROJECT_KEY,
  GET_CARBON_OFFSET_COSTS_REQUEST_INVALID_JSON,
  AMOUNT_UPDATES_REQUEST_MISSING_PSP_REFERENCE,
} = errorMessages

describe('Validator builder', () => {
  it('on invalid JSON validateRequestFields() should return error object', () => {
    const invalidJSONContent = '{"a"}'
    const invalidPayment = {
      custom: {
        fields: {
          createSessionRequest: invalidJSONContent,
          getCarbonOffsetCostsRequest: invalidJSONContent,
        },
      },
    }
    const errorObject = withPayment(invalidPayment)
      .validateRequestFields()
      .getErrors()
    expect(errorObject[0].message).to.equal(CREATE_SESSION_REQUEST_INVALID_JSON)
    expect(errorObject[1].message).to.equal(
      GET_CARBON_OFFSET_COSTS_REQUEST_INVALID_JSON,
    )
  })

  it(
    'payment has different amountPlanned and amount in createSessionRequest custom field ' +
      'and interface interaction is empty, ' +
      'validateAmountPlanned() should return error object',
    () => {
      const payment = {
        amountPlanned: {
          type: 'centPrecision',
          currencyCode: 'EUR',
          centAmount: 10,
          fractionDigits: 2,
        },
        custom: {
          fields: {
            createSessionRequest: JSON.stringify({
              amount: {
                currency: 'EUR',
                value: 1000,
              },
            }),
          },
        },
        interfaceInteractions: [],
      }
      const errorObject = withPayment(payment)
        .validateAmountPlanned()
        .getErrors()
      expect(errorObject[0].message).to.equal(
        CREATE_SESSION_AMOUNT_PLANNED_NOT_SAME,
      )
    },
  )

  it(
    'payment has different amountPlanned and amount in createSessionRequest interface interaction, ' +
      'validateAmountPlanned() should return error object',
    () => {
      const payment = {
        amountPlanned: {
          type: 'centPrecision',
          currencyCode: 'EUR',
          centAmount: 10,
          fractionDigits: 2,
        },
        custom: {
          fields: {
            createSessionRequest: JSON.stringify({
              amount: {
                currency: 'EUR',
                value: 10,
              },
            }),
          },
        },
        interfaceInteractions: [
          {
            fields: {
              type: 'createSession',
              request: JSON.stringify({
                amount: {
                  currency: 'EUR',
                  value: 10,
                },
              }),
              createdAt: '2018-05-14T07:18:37.560Z',
            },
          },
          {
            fields: {
              type: 'createSession',
              request: JSON.stringify({
                amount: {
                  currency: 'EUR',
                  value: 1000,
                },
              }),
              createdAt: '2020-05-14T07:18:37.560Z',
            },
          },
          {
            fields: {
              type: 'createSession',
              request: JSON.stringify({
                amount: {
                  currency: 'EUR',
                  value: 10,
                },
              }),
              createdAt: '2019-05-14T07:18:37.560Z',
            },
          },
        ],
      }

      const errorObject = withPayment(payment)
        .validateAmountPlanned()
        .getErrors()
      expect(errorObject[0].message).to.equal(
        CREATE_SESSION_AMOUNT_PLANNED_NOT_SAME,
      )
    },
  )

  it('on missing reference in createSessionRequest should return error object', () => {
    const createSessionRequestDraft = {
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
    const invalidPayment = {
      custom: {
        fields: {
          createSessionRequest: JSON.stringify(createSessionRequestDraft),
        },
      },
    }
    const errorObject = withPayment(invalidPayment)
      .validateReference()
      .getErrors()

    expect(errorObject[0].message).to.equal(
      CREATE_SESSION_REQUEST_MISSING_REFERENCE,
    )
  })

  it('on missing commercetoolsProjectKey in custom fields should return error object', () => {
    const invalidPayment = {
      custom: {
        fields: {
          adyenMerchantAccount: 'foo',
        },
      },
    }
    const errorObject = withPayment(invalidPayment)
      .validateMetadataFields()
      .getErrors()

    expect(errorObject[0].message).to.equal(
      MISSING_REQUIRED_FIELDS_CTP_PROJECT_KEY,
    )
  })

  it('on missing adyenMerchantAccount in custom fields should return error object', () => {
    const invalidPayment = {
      custom: {
        fields: {
          commercetoolsProjectKey: 'bar',
        },
      },
    }
    const errorObject = withPayment(invalidPayment)
      .validateMetadataFields()
      .getErrors()

    expect(errorObject[0].message).to.equal(
      MISSING_REQUIRED_FIELDS_ADYEN_MERCHANT_ACCOUNT,
    )
  })

  it('on missing required custom fields should return error object', () => {
    const invalidPayment = {
      custom: {
        fields: {
          commercetoolsProjectKey: ' white spaced projectKey',
          adyenMerchantAccount: ' ',
        },
      },
    }
    const errorObject = withPayment(invalidPayment)
      .validateMetadataFields()
      .getErrors()

    expect(errorObject[0].message).to.equal(
      MISSING_REQUIRED_FIELDS_CTP_PROJECT_KEY,
    )
    expect(errorObject[1].message).to.equal(
      MISSING_REQUIRED_FIELDS_ADYEN_MERCHANT_ACCOUNT,
    )
  })

  it('on missing required paymentIspReference should return error object', () => {
    const amountUpdatesRequestDraft = {
      amount: {
        currency: 'EUR',
        value: 1010,
      },
      reason: 'delayedCharge',
      reference: 'test',
      merchantAccount: 'test',
    }

    const invalidPayment = {
      custom: {
        fields: {
          amountUpdatesRequest: JSON.stringify(amountUpdatesRequestDraft),
        },
      },
    }

    const errorObject = withPayment(invalidPayment)
      .validatePaymentPspReference()
      .getErrors()

    expect(errorObject[0].message).to.equal(
      AMOUNT_UPDATES_REQUEST_MISSING_PSP_REFERENCE,
    )
  })
})
