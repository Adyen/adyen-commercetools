const { expect } = require('chai')

const ValidatorBuilder = require('../../src/validator/validator-builder')
const {
  GET_ORIGIN_KEYS_REQUEST_INVALID_JSON,
  GET_PAYMENT_METHODS_REQUEST_INVALID_JSON,
  MAKE_PAYMENT_REQUEST_INVALID_JSON,
  SUBMIT_ADDITIONAL_PAYMENT_DETAILS_REQUEST_INVALID_JSON,
  AMOUNT_PLANNED_CHANGE_NOT_ALLOWED,
  MAKE_PAYMENT_REQUEST_MISSING_REFERENCE
} = require('../../src/validator/error-messages')

describe('Validator builder', () => {
  it('on invalid JSON validateRequestFields() should return error object', async () => {
    const invalidPayment = {
      custom: {
        fields: {
          getOriginKeysRequest: '{"a"}',
          getPaymentMethodsRequest: '{"a"}',
          makePaymentRequest: '{"a"}',
          submitAdditionalPaymentDetailsRequest: '{"a"}'
        }
      }
    }
    const errorObject = ValidatorBuilder.withPayment(invalidPayment)
      .validateRequestFields()
      .getErrors()
    expect(errorObject.getOriginKeysRequest).to.equal(GET_ORIGIN_KEYS_REQUEST_INVALID_JSON)
    expect(errorObject.getPaymentMethodsRequest).to.equal(GET_PAYMENT_METHODS_REQUEST_INVALID_JSON)
    expect(errorObject.makePaymentRequest).to.equal(MAKE_PAYMENT_REQUEST_INVALID_JSON)
    expect(errorObject.submitAdditionalPaymentDetailsRequest)
      .to.equal(SUBMIT_ADDITIONAL_PAYMENT_DETAILS_REQUEST_INVALID_JSON)
  })

  it('when having a different amountPlanned and amount in makePaymentRequest, ' +
    'validateAmountPlanned() should return error object', async () => {
    const payment = {
      amountPlanned: {
        type: 'centPrecision',
        currencyCode: 'EUR',
        centAmount: 10,
        fractionDigits: 2
      },
      custom: {
        fields: {
          makePaymentRequest: JSON.stringify({
            amount: {
              currency: 'EUR',
              value: 1000
            }
          })
        }
      }
    }
    const errorObject = ValidatorBuilder.withPayment(payment)
      .validateAmountPlanned()
      .getErrors()
    expect(errorObject.amountPlanned).to.equal(AMOUNT_PLANNED_CHANGE_NOT_ALLOWED)
  })

  it('on missing reference in makePaymentRequest should return error object', async () => {
    const makePaymentRequestDraft = {
      paymentMethod: {
        type: 'klarna'
      },
      amount: {
        currency: 'EUR',
        value: 1000
      },
      shopperLocale: 'de_DE',
      countryCode: 'DE',
      shopperEmail: 'youremail@email.com',
      shopperReference: 'YOUR_UNIQUE_SHOPPER_ID',
      returnUrl: 'https://www.yourshop.com/checkout/result'
    }
    const invalidPayment = {
      custom: {
        fields: {
          makePaymentRequest: JSON.stringify(makePaymentRequestDraft)
        }
      }
    }
    const errorObject = ValidatorBuilder.withPayment(invalidPayment)
      .validateReference()
      .getErrors()

    expect(errorObject.missingReference).to.equal(MAKE_PAYMENT_REQUEST_MISSING_REFERENCE)
  })
})
