const { expect } = require('chai')
const async = require('async')

const ValidatorBuilder = require('../../src/validator/validator-builder')
const {
  GET_ORIGIN_KEYS_REQUEST_INVALID_JSON,
  GET_PAYMENT_METHODS_REQUEST_INVALID_JSON,
  MAKE_PAYMENT_REQUEST_INVALID_JSON,
  SUBMIT_ADDITIONAL_PAYMENT_DETAILS_REQUEST_INVALID_JSON
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
      vb.validatePaymentDataField,
      vb.validatePaResField,
      vb.validateMdField],
    (validation) => {
      it(`on empty payment object validation for ${validation.name} to not throw exception`, async () => {
        expect(validation).to.not.throw()
      })
    }
  )

  it('on invalid JSON validateRequestFields() should return error object', async () => {
    const invalidPaymentString = {
      custom: {
        fields: {
          getOriginKeysRequest: '{"a"}',
          getPaymentMethodsRequest: '{"a"}',
          makePaymentRequest: '{"a"}',
          submitAdditionalPaymentDetailsRequest: '{"a"}'
        }
      }
    }
    const errorObject = ValidatorBuilder.withPayment(invalidPaymentString)
      .validateRequestFields()
      .getErrors()
    expect(errorObject.getOriginKeysRequest).to.equal(GET_ORIGIN_KEYS_REQUEST_INVALID_JSON)
    expect(errorObject.getPaymentMethodsRequest).to.equal(GET_PAYMENT_METHODS_REQUEST_INVALID_JSON)
    expect(errorObject.makePaymentRequest).to.equal(MAKE_PAYMENT_REQUEST_INVALID_JSON)
    expect(errorObject.submitAdditionalPaymentDetailsRequest)
      .to.equal(SUBMIT_ADDITIONAL_PAYMENT_DETAILS_REQUEST_INVALID_JSON)
  })
})
