const { expect } = require('chai')
const async = require('async')

const ValidatorBuilder = require('../../src/validator/validator-builder')

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
})
