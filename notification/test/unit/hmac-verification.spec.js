const { expect } = require('chai')
const { hmacValidator } = require('@adyen/api-library');
const notificationRequest = require('../resources/hmac-signed-notification.json')

describe('verify hmac signatures', () => {
  const validator = new hmacValidator()
  const notificationRequestItem = notificationRequest.notificationItems[0].NotificationRequestItem

  it('given a sample signed notification ' +
    'when matches with the stored HMAC key ' +
    'then verification should pass', () => {
    const storedHmacKey = '44782DEF547AAA06C910C43932B1EB0C71FC68D9D0C057550C48EC2ACF6BA056'
    const valid = validator.validateHMAC(notificationRequestItem, storedHmacKey)
    expect(valid).to.equal(true)
  })

  it('given a sample signed notification ' +
    'when NOT matches with the stored HMAC key ' +
    'then verification should NOT pass', () => {
    const hmacKey = 'DFB1EB5485895CFA84146406857104ABB4CBCABDC8AAF103A624C8F6A3EAAB00'
    const valid = validator.validateHMAC(notificationRequestItem, hmacKey)
    expect(valid).to.equal(false)
  })

})
