const { expect } = require('chai')
const async = require('async')

const ValidatorBuilder = require('../../src/validator/validator-builder')
const {
  GET_ORIGIN_KEYS_REQUEST_INVALID_JSON,
  GET_PAYMENT_METHODS_REQUEST_INVALID_JSON,
  MAKE_PAYMENT_REQUEST_INVALID_JSON,
  SUBMIT_ADDITIONAL_PAYMENT_DETAILS_REQUEST_INVALID_JSON,
  AMOUNT_PLANNED_CHANGE_NOT_ALLOWED,
  MANUAL_CAPTURE_REQUEST_INVALID_JSON
} = require('../../src/validator/error-messages')

describe('Validator builder', () => {
  const vb = ValidatorBuilder.withPayment({})

  async.each(
    [vb.validateEncryptedCardNumberField,
      vb.validateEncryptedExpiryMonthField,
      vb.validateEncryptedExpiryYearField,
      vb.validateEncryptedSecurityCodeField,
      vb.validateReturnUrlField,
      vb.validatePayloadField,
      vb.validatePaResField,
      vb.validateMdField],
    (validation) => {
      it(`on empty payment object validation for ${validation.name} to not throw exception`, async () => {
        expect(validation).to.not.throw()
      })
    }
  )

  it('on invalid JSON validateRequestFields() should return error object', async () => {
    const invalidPayment = {
      custom: {
        fields: {
          getOriginKeysRequest: '{"a"}',
          getPaymentMethodsRequest: '{"a"}',
          makePaymentRequest: '{"a"}',
          submitAdditionalPaymentDetailsRequest: '{"a"}',
          manualCaptureRequest: '{"a"}'
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
    expect(errorObject.manualCaptureRequest).to.equal(MANUAL_CAPTURE_REQUEST_INVALID_JSON)
  })

  it('on changing amountPlanned when different amountPlanned exists in the interaction, ' +
    'validateAmountPlanned() should return error object', async () => {
    const payment = {
      amountPlanned: {
        type: 'centPrecision',
        currencyCode: 'EUR',
        centAmount: 10,
        fractionDigits: 2
      },
      interfaceInteractions: [
        {
          fields: {
            type: 'makePayment',
            request: JSON.stringify({
              amount: {
                currency: 'EUR',
                value: 10
              }
            }),
            createdAt: '2018-05-14T07:18:37.560Z'
          }
        },
        {
          fields: {
            type: 'makePayment',
            request: JSON.stringify({
              amount: {
                currency: 'EUR',
                value: 1000
              }
            }),
            createdAt: '2020-05-14T07:18:37.560Z'
          }
        },
        {
          fields: {
            type: 'makePayment',
            request: JSON.stringify({
              amount: {
                currency: 'EUR',
                value: 10
              }
            }),
            createdAt: '2019-05-14T07:18:37.560Z'
          }
        }
      ]
    }
    const errorObject = ValidatorBuilder.withPayment(payment)
      .validateAmountPlanned()
      .getErrors()
    expect(errorObject.amountPlanned).to.equal(AMOUNT_PLANNED_CHANGE_NOT_ALLOWED)
  })
})
