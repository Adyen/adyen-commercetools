export default JSON.stringify({
  additionalData: {
    cvcResult: '1 Matches',
    authCode: '010800',
    avsResult: '4 AVS not supported for this card type',
    cardHolderName: 'Checkout Shopper PlaceHolder',
    paymentMethod: 'visa',
    authorisationMid: '1000',
    acquirerAccountCode: 'TestPmmAcquirerAccount',
  },
  pspReference: '853587031437598F',
  resultCode: 'Authorised',
  amount: {
    currency: 'EUR',
    value: 1000,
  },
  merchantReference: 'YOUR_REFERENCE',
})
