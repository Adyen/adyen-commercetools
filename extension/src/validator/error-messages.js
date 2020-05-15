module.exports = {
  MISSING_PAYMENT_INTERFACE: 'Set paymentMethodInfo.paymentInterface = \'ctp-adyen-integration\'',
  MISSING_TXN_AUTHORIZATION_PENDING: 'Have one transaction with type=\'Authorization\' AND state=\'Pending\'',
  MISSING_TXN_AUTHORIZATION_INIT: 'Have one transaction with type=\'Authorization\' AND state=\'Initial\'',
  MISSING_CARD_NUMBER: 'Set custom.fields.encryptedCardNumber',
  MISSING_EXPIRY_MONTH: 'Set custom.fields.encryptedExpiryMonth',
  MISSING_EXPIRY_YEAR: 'Set custom.fields.encryptedExpiryYear',
  MISSING_SECURITY_CODE: 'Set custom.fields.encryptedSecurityCode',
  MISSING_RETURN_URL: 'Set custom.fields.returnUrl',
  MISSING_PAYLOAD: 'Set custom.fields.payload',
  MISSING_PAYMENT_DATA: 'Set custom.fields.paymentData',
  MISSING_PARES: 'Set custom.fields.PaRes',
  MISSING_MD: 'Set custom.fields.MD',
  GET_ORIGIN_KEYS_REQUEST_INVALID_JSON: 'getOriginKeysRequest does not contain valid JSON.',
  GET_PAYMENT_METHODS_REQUEST_INVALID_JSON: 'getOriginKeysRequest does not contain valid JSON.',
  MAKE_PAYMENT_REQUEST_INVALID_JSON: 'makePaymentRequest does not contain valid JSON.',
  // eslint-disable-next-line max-len
  SUBMIT_ADDITIONAL_PAYMENT_DETAILS_REQUEST_INVALID_JSON: 'submitAdditionalPaymentDetailsRequest does not contain valid JSON.',
  AMOUNT_PLANNED_CHANGE_NOT_ALLOWED: 'amountPlanned field cannot be changed after makePayment request is made to Adyen'
}
