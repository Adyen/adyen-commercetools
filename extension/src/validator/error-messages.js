export default {
  CREATE_SESSION_REQUEST_INVALID_JSON:
    'createSession does not contain valid JSON.',
  AMOUNT_PLANNED_NOT_SAME:
    'amountPlanned field must be the same as the amount in ' +
    'createSessionRequest in the interface interactions or createSessionRequest  in the custom field',
  CREATE_SESSION_REQUEST_MISSING_REFERENCE:
    'Required "reference" field is missing in createSessionReqeust.',
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
