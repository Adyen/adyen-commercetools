const { cloneDeep } = require('lodash')
const { expect } = require('chai')
const { validateHmacSignature } = require('../../src/utils/hmacValidator')
const config = require('../../src/config/config')()
const notificationRequest = require('../resources/notification.json')

const notification = notificationRequest.notificationItems[0]

describe('verify hmac signatures', () => {
  before(() => {
    config.adyen.enableHmacSignature = true // default
    config.adyen.secretHmacKey =
      '44782DEF547AAA06C910C43932B1EB0C71FC68D9D0C057550C48EC2ACF6BA056' // Sample HMAC key
  })

  it(
    'given a sample signed notification ' +
      'when matches with the stored HMAC key ' +
      'then verification should pass',
    () => {
      const errorMessage = validateHmacSignature(notification)
      expect(errorMessage).to.equal(null)
    }
  )

  it(
    'given a sample signed notification ' +
      'when notification is modified on the way' +
      'then verification should NOT pass',
    () => {
      const modifiedNotification = cloneDeep(notification)
      modifiedNotification.NotificationRequestItem.amount.value = 0

      const errorMessage = validateHmacSignature(modifiedNotification)
      expect(errorMessage).to.equal(
        'Notification does not have a valid HMAC signature, ' +
          'please confirm that the notification was sent by Adyen, and was not modified during transmission.'
      )
    }
  )

  it(
    'given a sample signed notification ' +
      'when notification does not have additionalData field' +
      'then verification should pass',
    () => {
      const modifiedNotification = cloneDeep(notification)
      modifiedNotification.NotificationRequestItem.additionalData = null

      const errorMessage = validateHmacSignature(modifiedNotification)
      expect(errorMessage).to.equal(
        'Notification does not contain the required field ' +
          '"NotificationRequestItem.additionalData". Please check if HMAC is configured correctly or contact Adyen.'
      )
    }
  )

  it(
    'given a sample signed notification ' +
      'when notification does not have hmacSignature field' +
      'then verification should pass',
    () => {
      const modifiedNotification = cloneDeep(notification)
      modifiedNotification.NotificationRequestItem.additionalData.hmacSignature = null

      const errorMessage = validateHmacSignature(modifiedNotification)
      expect(errorMessage).to.equal(
        'Notification does not contain the required field ' +
          '"NotificationRequestItem.additionalData.hmacSignature". ' +
          'Please check if HMAC is configured correctly or contact Adyen.'
      )
    }
  )
})
