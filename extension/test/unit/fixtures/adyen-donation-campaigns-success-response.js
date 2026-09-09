export default JSON.stringify({
  donationCampaigns: [
    {
      id: 'testID',
      campaignName: 'Test campaign',
      donation: {
        currency: 'EUR',
        donationType: 'fixedAmounts',
        type: 'fixedAmounts',
        values: [100, 200, 300],
      },
      nonprofitName: 'Giving Nonprofit Demo',
      causeName: 'UNICEF',
      // eslint-disable-next-line @stylistic/js/max-len
      nonprofitDescription:
        // eslint-disable-next-line @stylistic/js/max-len
        "Your donation will help UNICEF provide a fair chance to every child to survive and thrive. 100% of your donation will go towards UNICEF's programmes where it is most needed. *UNICEF does not endorse any company, brand, product or service.",
      nonprofitUrl: 'https://www.adyen.com',
      logoUrl:
        'https://cdf6519016.cdn.adyen.com/adyen-giving/causes/04080756-16bf-43a2-8fa5-721c73c3b395.png',
      bannerUrl:
        'https://cdf6519016.cdn.adyen.com/adyen-giving/causes/81282090-b5ed-4883-8a4a-26c494c6e22a.png',
      termsAndConditionsUrl: 'https://www.adyen.com',
    },
  ],
})
