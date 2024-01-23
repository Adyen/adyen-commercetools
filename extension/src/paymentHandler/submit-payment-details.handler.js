import _ from 'lodash'
import { submitAdditionalPaymentDetails } from '../service/web-component-service.js'
import {
  createAddInterfaceInteractionAction,
  createSetCustomFieldAction,
  createAddTransactionActionByResponse,
  getPaymentKeyUpdateAction,
} from './payment-utils.js'
import c from '../config/constants.js'

const { CTP_INTERACTION_TYPE_SUBMIT_ADDITIONAL_PAYMENT_DETAILS } = c

async function execute(paymentObject) {
  const actions = []
  const submitAdditionalDetailsRequestObj = JSON.parse(
    paymentObject.custom.fields.submitAdditionalPaymentDetailsRequest,
  )
  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const commercetoolsProjectKey =
    paymentObject.custom.fields.commercetoolsProjectKey
  if (!submitAdditionalDetailsRequestObj.paymentData) {
    const makePaymentResponseObj = JSON.parse(
      paymentObject.custom.fields.makePaymentResponse,
    )
    submitAdditionalDetailsRequestObj.paymentData =
      makePaymentResponseObj.paymentData
  }
  if (_isNewRequest(submitAdditionalDetailsRequestObj, paymentObject)) {
    const { request, response } = await submitAdditionalPaymentDetails(
      adyenMerchantAccount,
      commercetoolsProjectKey,
      submitAdditionalDetailsRequestObj,
    )
    actions.push(
      createAddInterfaceInteractionAction({
        request,
        response,
        type: c.CTP_INTERACTION_TYPE_SUBMIT_ADDITIONAL_PAYMENT_DETAILS,
      }),
      createSetCustomFieldAction(
        c.CTP_CUSTOM_FIELD_SUBMIT_ADDITIONAL_PAYMENT_DETAILS_RESPONSE,
        response,
      ),
    )

    if (
      !_hasTransactionWithPspReference(response.pspReference, paymentObject)
    ) {
      const addTransactionAction = createAddTransactionActionByResponse(
        paymentObject.amountPlanned.centAmount,
        paymentObject.amountPlanned.currencyCode,
        response,
      )

      if (addTransactionAction) actions.push(addTransactionAction)
    }
    const updatePaymentAction = getPaymentKeyUpdateAction(
      paymentObject.key,
      request,
      response,
    )
    if (updatePaymentAction) actions.push(updatePaymentAction)
  }
  return {
    actions,
  }
}

function _isNewRequest(
  submitAdditionalPaymentDetailsRequestObj,
  paymentObject,
) {
  const interfaceInteraction = paymentObject.interfaceInteractions.find(
    (interaction) =>
      interaction.fields.type ===
      CTP_INTERACTION_TYPE_SUBMIT_ADDITIONAL_PAYMENT_DETAILS,
  )
  if (!interfaceInteraction)
    // request is new if there are no requests yet
    return true
  const oldSubmitDetailsRequest = interfaceInteraction.fields.request
  if (oldSubmitDetailsRequest) {
    const oldSubmitDetailsRequestObj = JSON.parse(oldSubmitDetailsRequest)
    const newSubmitDetailsRequestObj = _.cloneDeep(
      submitAdditionalPaymentDetailsRequestObj,
    )
    delete newSubmitDetailsRequestObj.merchantAccount
    if (!_.isEqual(oldSubmitDetailsRequestObj, newSubmitDetailsRequestObj))
      // request is new if new and old requests are different
      return true
  }

  return false
}

function _hasTransactionWithPspReference(pspReference, paymentObject) {
  return paymentObject.transactions.some(
    (transaction) => transaction.interactionId === pspReference,
  )
}

export default { execute }
