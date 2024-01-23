import chai from 'chai'
import utils from '../../src/utils/commons.js'

const { expect } = chai

describe('notification module common utility', () => {
  it(`should get a list of shorten notification object for tracking when notification contains an array of 
        notification items.`, async () => {
    const notifications = [
      {
        NotificationRequestItem: {
          amount: {
            currency: 'EUR',
            value: 10100,
          },
          eventCode: 'AUTHORISATION',
          eventDate: '2019-01-30T18:16:22+01:00',
          merchantAccountCode: 'YOUR_MERCHANT_ACCOUNT',
          merchantReference: '8313842560770001',
          operations: ['CANCEL', 'CAPTURE', 'REFUND'],
          paymentMethod: 'visa',
          pspReference: 'test_AUTHORISATION_1',
          success: 'true',
        },
      },
      {
        NotificationRequestItem: {
          amount: {
            currency: 'USD',
            value: 10100,
          },
          eventCode: 'AUTHORISATION',
          eventDate: '2019-02-01T18:16:22+01:00',
          merchantAccountCode: 'YOUR_MERCHANT_ACCOUNT',
          merchantReference: '8313842560770001',
          operations: ['CANCEL', 'CAPTURE', 'REFUND'],
          paymentMethod: 'visa',
          pspReference: 'test_AUTHORISATION_2',
          success: 'true',
        },
      },
    ]
    const actualNotificationResult =
      await utils.getNotificationForTracking(notifications)
    const expectedNotificationResult = [
      {
        eventCode: 'AUTHORISATION',
        eventDate: '2019-01-30T18:16:22+01:00',
        pspReference: 'test_AUTHORISATION_1',
        success: 'true',
      },
      {
        eventCode: 'AUTHORISATION',
        eventDate: '2019-02-01T18:16:22+01:00',
        pspReference: 'test_AUTHORISATION_2',
        success: 'true',
      },
    ]

    // assert notification for tracking
    expect(actualNotificationResult).to.deep.equal(expectedNotificationResult)
  })

  it(`should get a shorten notification object for tracking when notification contains single notification 
        item without array.`, async () => {
    const notifications = {
      NotificationRequestItem: {
        amount: {
          currency: 'EUR',
          value: 10100,
        },
        eventCode: 'AUTHORISATION',
        eventDate: '2019-01-30T18:16:22+01:00',
        merchantAccountCode: 'YOUR_MERCHANT_ACCOUNT',
        merchantReference: '8313842560770001',
        operations: ['CANCEL', 'CAPTURE', 'REFUND'],
        paymentMethod: 'visa',
        pspReference: 'test_AUTHORISATION_1',
        success: 'true',
      },
    }

    const actualNotificationResult =
      await utils.getNotificationForTracking(notifications)
    const expectedNotificationResult = {
      eventCode: 'AUTHORISATION',
      eventDate: '2019-01-30T18:16:22+01:00',
      pspReference: 'test_AUTHORISATION_1',
      success: 'true',
    }

    // assert notification for tracking
    expect(actualNotificationResult).to.deep.equal(expectedNotificationResult)
  })
})
