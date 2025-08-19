import c from '../config/constants.js'
import {
    donationCampaigns,
} from '../service/web-component-service.js'
import {createSetCustomFieldAction} from "./payment-utils.js";

async function handleDonations({ actions, adyenMerchantAccount, donationCampaignRequest, donationToken }) {
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

    if (campaign) {
        actions.push(
            createSetCustomFieldAction(c.CTP_CUSTOM_FIELD_DONATION_TOKEN, donationToken)
        );
        actions.push(
            createSetCustomFieldAction(c.CTP_CUSTOM_FIELD_DONATION_CAMPAIGN, campaign)
        );
    }
}

export { handleDonations };
