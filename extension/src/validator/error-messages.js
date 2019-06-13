module.exports = {
  MISSING_PAYMENT_INTERFACE: 'Set paymentMethodInfo.paymentInterface = \'ctp-adyen-integration\'',
  /* eslint-disable-next-line max-len */
  INVALID_PAYMENT_METHOD: 'Set paymentMethodInfo.method to one of the supported methods or leave empty for fetching available payment methods from Adyen',
  MISSING_TXN_CHARGE_PENDING: 'Have one transaction with type=\'Charge\' AND state=\'Pending\'',
  MISSING_TXN_CHARGE_INIT: 'Have one transaction with type=\'Charge\' AND state=\'Initial\'',
  MISSING_CARD_NUMBER: 'Set custom.fields.encryptedCardNumber',
  MISSING_EXPIRY_MONTH: 'Set custom.fields.encryptedExpiryMonth',
  MISSING_EXPIRY_YEAR: 'Set custom.fields.encryptedExpiryYear',
  MISSING_SECURITY_CODE: 'Set custom.fields.encryptedSecurityCode',
  MISSING_RETURN_URL: 'Set custom.fields.returnUrl',
  MISSING_MERCHANT_REFERENCE: 'Set custom merchantReference',
  MISSING_PAYLOAD: 'Set custom.fields.payload',
  MISSING_PAYMENT_DATA: 'Set custom.fields.paymentData',
  MISSING_PARES: 'Set custom.fields.PaRes',
  MISSING_MD: 'Set custom.fields.MD',
  MISSING_TXN_CHARGE_INIT_PENDING: 'Have one Charge transaction in state=\'Initial\' or state=\'Pending\''
}
