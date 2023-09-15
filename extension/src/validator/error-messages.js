export default {
  CREATE_SESSION_REQUEST_INVALID_JSON:
    'createSession does not contain valid JSON.',
  GET_PAYMENT_METHODS_REQUEST_INVALID_JSON:
    'getPaymentMethodsRequest does not contain valid JSON.',
  MAKE_PAYMENT_REQUEST_INVALID_JSON:
    'makePaymentRequest does not contain valid JSON.',
  SUBMIT_ADDITIONAL_PAYMENT_DETAILS_REQUEST_INVALID_JSON:
    'submitAdditionalPaymentDetailsRequest does not contain valid JSON.',
  MAKE_PAYMENT_AMOUNT_PLANNED_NOT_SAME:
    'amountPlanned field must be the same as the amount in ' +
    'makePaymentRequest in the interface interactions or makePaymentRequest  in the custom field',
  CREATE_SESSION_AMOUNT_PLANNED_NOT_SAME:
    'amountPlanned field must be the same as the amount in ' +
    'createSessionRequest in the interface interactions or createSessionRequest  in the custom field',
  CREATE_SESSION_REQUEST_MISSING_REFERENCE:
    'Required "reference" field is missing in createSessionReqeust.',
  MAKE_PAYMENT_REQUEST_MISSING_REFERENCE:
    'Required "reference" field is missing in makePaymentRequest.',
  MISSING_REQUIRED_FIELDS_CTP_PROJECT_KEY:
    'Required field "commercetoolsProjectKey" is missing or empty.',
  MISSING_REQUIRED_FIELDS_ADYEN_MERCHANT_ACCOUNT:
    'Required field "adyenMerchantAccount" is missing or empty.',
  UNAUTHORIZED_REQUEST: 'The request is unauthorized.',
  MISSING_CREDENTIAL:
    'Credential is missing in required project configuration.',
  GET_CARBON_OFFSET_COSTS_REQUEST_INVALID_JSON:
    'getCarbonOffsetCostsRequest does not contain valid JSON.',
  AMOUNT_UPDATES_REQUEST_INVALID_JSON:
    'amountUpdatesRequest does not contain valid JSON.',
  AMOUNT_UPDATES_REQUEST_MISSING_PSP_REFERENCE:
    'Required "paymentPspReference" field is missing in amountUpdatesRequest.',
}
