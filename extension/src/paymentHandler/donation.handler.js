import c from '../config/constants.js'
import {
  donation,
  donationCampaigns,
} from '../service/web-component-service.js'
import { createSetCustomFieldAction, generateIdempotencyKey } from './payment-utils.js'

async function execute(paymentObject) {
  const actions = []
  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const donationRequest = JSON.parse(paymentObject.custom.fields.donationRequest)
  const idempotencyKey = generateIdempotencyKey({
    paymentObject,
    operation: 'donation',
    requestPayload: donationRequest,
  })

  const { response } = await donation(
    adyenMerchantAccount,
    donationRequest,
    idempotencyKey,
  )

  actions.push(
    createSetCustomFieldAction(c.CTP_CUSTOM_FIELD_DONATION_RESPONSE, response),
  )

  return { actions }
}

export async function handleDonationCampaign({
  actions,
  adyenMerchantAccount,
  donationCampaignRequest,
  donationToken,
  paymentObject,
}) {
  const idempotencyKey = generateIdempotencyKey({
    paymentObject,
    operation: 'donationCampaigns',
    requestPayload: donationCampaignRequest,
  })
  const { response: donationsResponse } = await donationCampaigns(
    adyenMerchantAccount,
    donationCampaignRequest,
    idempotencyKey,
  )
  let campaign = null
  if (
    donationsResponse &&
    Array.isArray(donationsResponse.donationCampaigns) &&
    donationsResponse.donationCampaigns.length > 0
  ) {
    campaign = donationsResponse.donationCampaigns[0]
  }

  if (campaign) {
    actions.push(
      createSetCustomFieldAction(
        c.CTP_CUSTOM_FIELD_DONATION_TOKEN,
        donationToken,
      ),
    )
    actions.push(
      createSetCustomFieldAction(
        c.CTP_CUSTOM_FIELD_DONATION_CAMPAIGN,
        campaign,
      ),
    )
  }
}

export default { execute }
