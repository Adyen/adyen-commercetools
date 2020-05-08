const { cloneDeep } = require('lodash')
const { expect } = require('chai')
const { hasValidHMACSignature } = require('../../src/utils/hmacValidator')
const notificationRequest = require('../resources/notification.json')
const notification = notificationRequest.notificationItems

describe('verify hmac signatures', () => {

  it('given a sample signed notification ' +
    'when matches with the stored HMAC key ' +
    'then verification should pass', () => {
    const valid = hasValidHMACSignature(notification)
    expect(valid).to.equal(true)
  })

  it('given a sample signed notification ' +
    'when notification is modified on the way' +
    'then verification should NOT pass', () => {
    const modifiedNotification = cloneDeep(notification)
    modifiedNotification[0].NotificationRequestItem.amount.value = 0

    const valid = hasValidHMACSignature(modifiedNotification)
    expect(valid).to.equal(false)
  })

})
