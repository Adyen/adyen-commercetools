import { expect } from 'chai'
import { validateHmacSignature } from '../../src/utils/hmacValidator.js'
import {
  overrideAdyenConfig,
  restoreAdyenConfig,
  createNotificationPayload,
} from '../test-utils.js'

describe('verify hmac signatures', () => {
  before(() => {
    overrideAdyenConfig({
      enableHmacSignature: true, // default
      secretHmacKey:
        '44782DEF547AAA06C910C43932B1EB0C71FC68D9D0C057550C48EC2ACF6BA056', // Sample HMAC key
    })
  })

  after(() => {
    restoreAdyenConfig()
  })

  it(
    'given a sample signed notification ' +
      'when matches with the stored HMAC key ' +
      'then verification should pass',
    () => {
      const notification = createNotificationPayload(
        'YOUR_PROJECT_KEY',
        'YOUR_ADYEN_ACCOUNT',
        `payment_${new Date().getTime()}`,
      )
      const errorMessage = validateHmacSignature(
        notification.notificationItems[0],
      )
      expect(errorMessage).to.equal(null)
    },
  )

  it(
    'given a sample signed notification ' +
      'when notification is modified on the way' +
      'then verification should NOT pass',
    () => {
      const modifiedNotification = createNotificationPayload(
        'YOUR_PROJECT_KEY',
        'YOUR_ADYEN_ACCOUNT',
        `payment_${new Date().getTime()}`,
      ).notificationItems[0]
      modifiedNotification.NotificationRequestItem.amount.value = 0

      const errorMessage = validateHmacSignature(modifiedNotification)
      expect(errorMessage).to.equal(
        'Notification does not have a valid HMAC signature, ' +
          'please confirm that the notification was sent by Adyen, and was not modified during transmission.',
      )
    },
  )

  it(
    'given a sample signed notification ' +
      'when notification does not have additionalData field' +
      'then verification should pass',
    () => {
      const modifiedNotification = createNotificationPayload(
        'YOUR_PROJECT_KEY',
        'YOUR_ADYEN_ACCOUNT',
        `payment_${new Date().getTime()}`,
      ).notificationItems[0]
      modifiedNotification.NotificationRequestItem.additionalData = null

      const errorMessage = validateHmacSignature(modifiedNotification)
      expect(errorMessage).to.equal(
        'Notification does not contain the required field ' +
          '"NotificationRequestItem.additionalData". Please check if HMAC is configured correctly or contact Adyen.',
      )
    },
  )

  it(
    'given a sample signed notification ' +
      'when notification does not have hmacSignature field' +
      'then verification should pass',
    () => {
      const modifiedNotification = createNotificationPayload(
        'YOUR_PROJECT_KEY',
        'YOUR_ADYEN_ACCOUNT',
        `payment_${new Date().getTime()}`,
      ).notificationItems[0]
      modifiedNotification.NotificationRequestItem.additionalData.hmacSignature =
        null

      const errorMessage = validateHmacSignature(modifiedNotification)
      expect(errorMessage).to.equal(
        'Notification does not contain the required field ' +
          '"NotificationRequestItem.additionalData.hmacSignature". ' +
          'Please check if HMAC is configured correctly or contact Adyen.',
      )
    },
  )
})
