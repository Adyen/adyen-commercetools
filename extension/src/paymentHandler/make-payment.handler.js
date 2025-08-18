import {
  createAddInterfaceInteractionAction,
  createSetCustomFieldAction,
  createSetMethodInfoMethodAction,
  createSetMethodInfoNameAction,
  createAddTransactionActionByResponse,
  getPaymentKeyUpdateAction,
  getMerchantReferenceCustomFieldUpdateAction,
} from './payment-utils.js'
import c from '../config/constants.js'
import {
  makePayment,
  donationCampaigns,
} from '../service/web-component-service.js'
import mappingCartDataUtils from './mapping-cart-data-utils.js'

async function execute(paymentObject) {
  let makePaymentRequestObj = JSON.parse(
    paymentObject.custom.fields.makePaymentRequest,
  )
  const commercetoolsProjectKey =
    paymentObject.custom.fields.commercetoolsProjectKey

  makePaymentRequestObj = await mappingCartDataUtils.getDataFromCart(
    makePaymentRequestObj,
    paymentObject,
    commercetoolsProjectKey,
  )
  paymentObject.custom.fields.makePaymentRequest = JSON.stringify(
    makePaymentRequestObj,
  )

  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const { request, response } = await makePayment(
    adyenMerchantAccount,
    commercetoolsProjectKey,
    makePaymentRequestObj,
  )
  const actions = [
    createAddInterfaceInteractionAction({
      request,
      response,
      type: c.CTP_INTERACTION_TYPE_MAKE_PAYMENT,
    }),
    createSetCustomFieldAction(
      c.CTP_CUSTOM_FIELD_MAKE_PAYMENT_RESPONSE,
      response,
    ),
  ]

  const requestBodyJson = JSON.parse(request.body)
  const paymentMethod = requestBodyJson?.paymentMethod?.type
  if (paymentMethod) {
    actions.push(createSetMethodInfoMethodAction(paymentMethod))
    const action = createSetMethodInfoNameAction(paymentMethod)
    if (action) actions.push(action)
  }

  const updatePaymentAction = getPaymentKeyUpdateAction(
    paymentObject.key,
    response,
  )
  if (updatePaymentAction) actions.push(updatePaymentAction)

  const updateMerchantReferenceCustomFieldAction =
    getMerchantReferenceCustomFieldUpdateAction(
      request,
      c.CTP_CUSTOM_FIELD_MERCHANT_REFERENCE,
    )
  if (updateMerchantReferenceCustomFieldAction)
    actions.push(updateMerchantReferenceCustomFieldAction)

  const addTransactionAction = createAddTransactionActionByResponse(
    paymentObject.amountPlanned.centAmount,
    paymentObject.amountPlanned.currencyCode,
    response,
  )

  if (addTransactionAction) actions.push(addTransactionAction)

  if (response.donationToken) {
    let donationCampaignRequest = {
      merchantAccount: adyenMerchantAccount,
      currency: paymentObject.amountPlanned.currencyCode,
      locale: makePaymentRequestObj.shopperLocale,
    }
    const { response: donationsResponse } = await donationCampaigns(
        adyenMerchantAccount,
        donationCampaignRequest,
    );
    let campaign = null;

    if (
        donationsResponse &&
        Array.isArray(donationsResponse.donationCampaigns) &&
        donationsResponse.donationCampaigns.length > 0
    ) {
      campaign = donationsResponse.donationCampaigns[0];
    }

    if (campaign !== null) {
      actions.push(
          createSetCustomFieldAction(
              c.CTP_CUSTOM_FIELD_DONATION_TOKEN,
              response.donationToken
          ),
      );

      actions.push(
          createSetCustomFieldAction(
              c.CTP_CUSTOM_FIELD_DONATION_CAMPAIGN,
              campaign
          ),
      );
    }
  }

  return {
    actions,
  }
}

export default { execute }
