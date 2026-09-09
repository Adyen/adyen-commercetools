import nock from 'nock'
import donationCampaignsResponse from './fixtures/adyen-donation-campaigns-success-response.js'

function _mockDonationCampaigns() {
  const adyenScope = nock(`https://checkout-test.adyen.com/v71`)
  adyenScope.post('/donationCampaigns').reply(200, donationCampaignsResponse)
}

export default { _mockDonationCampaigns }
