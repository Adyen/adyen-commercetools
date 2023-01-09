export default JSON.stringify({
  merchantAccount: 'YOUR_MERCHANT_ACCOUNT',
  amount: {
    value: 1000,
    currency: 'EUR',
  },
  returnUrl: 'https://your-company.com/checkout?shopperOrder=12xy..',
  reference: 'YOUR_REFERENCE',
  countryCode: 'NL',
})
