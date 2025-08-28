export default JSON.stringify({
  amount: {
    currency: 'EUR',
    value: 100,
  },
  donationAccount: 'testDonationAccount',
  id: 'testId',
  merchantAccount: 'testAcc',
  payment: {
    pspReference: 'testPSP',
    resultCode: 'Authorised',
    amount: {
      currency: 'EUR',
      value: 100,
    },
    merchantReference: 'testMerchantReference',
    paymentMethod: {
      type: 'test',
    },
  },
  reference: 'test',
  status: 'completed',
})
