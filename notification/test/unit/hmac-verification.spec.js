const { cloneDeep } = require('lodash')
const { expect } = require('chai')
const { hasValidHmacSignature } = require('../../src/utils/hmacValidator')
const config = require('../../src/config/config')()
const notificationRequest = require('../resources/notification.json')

const notification = notificationRequest.notificationItems[0]

describe('verify hmac signatures', () => {
  before(() => {
    config.adyen.enableHmacSignature = true // default
    config.adyen.secretHmacKey = '44782DEF547AAA06C910C43932B1EB0C71FC68D9D0C057550C48EC2ACF6BA056' // Sample HMAC key
  })

  it('given a sample signed notification '
    + 'when matches with the stored HMAC key '
    + 'then verification should pass', () => {
    const valid = hasValidHmacSignature(notification)
    expect(valid).to.equal(true)
  })

  it('given a sample signed notification '
    + 'when notification is modified on the way'
    + 'then verification should NOT pass', () => {
    const modifiedNotification = cloneDeep(notification)
    modifiedNotification.NotificationRequestItem.amount.value = 0

    const valid = hasValidHmacSignature(modifiedNotification)
    expect(valid).to.equal(false)
  })
})
