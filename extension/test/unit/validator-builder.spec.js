const _ = require('lodash')
const { expect } = require('chai')
var async = require('async')

const ValidatorBuilder = require('../../src/validator/validator-builder')

describe('Validator builder', () => {

  let vb = ValidatorBuilder.withPayment({})

  async.each(
    [vb.validateEncryptedCardNumberField,
    vb.validateEncryptedExpiryMonthField,
    vb.validateEncryptedExpiryYearField,
    vb.validateEncryptedSecurityCodeField,
    vb.validateReturnUrlField,
    vb.validateMerchantReferenceField,
    vb.validatePayloadField,
    vb.validatePaymentDataField,
    vb.validatePaResField,
    vb.validateMdField],
    function(validation) {
    it('on empty payment object validation for ' + validation.name + ' to not throw exception', async () => {
      expect(validation).to.not.throw()
    })
  })
})
