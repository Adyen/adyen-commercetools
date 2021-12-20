const { hmacValidator } = require('@adyen/api-library')
const config = require('../../../src/config/config')

const validator = new hmacValidator()

function createNotificationPayload(
  commercetoolsProjectKey,
  adyenMerchantAccount,
  paymentKey,
  eventCode = 'AUTHORISATION',
  pspReference = 'test_AUTHORISATION_1',
  success = 'true'
) {
  const notification = {
    live: 'false',
    notificationItems: [
      {
        NotificationRequestItem: {
          additionalData: {
            'metadata.ctProjectKey': commercetoolsProjectKey,
          },
          amount: {
            currency: 'EUR',
            value: 10100,
          },
          eventCode,
          eventDate: '2019-01-30T18:16:22+01:00',
          merchantAccountCode: adyenMerchantAccount,
          merchantReference: paymentKey,
          operations: ['CANCEL', 'CAPTURE', 'REFUND'],
          paymentMethod: 'visa',
          pspReference,
          success,
        },
      },
    ],
  }
  const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
  const notificationRequestItem =
    notification.notificationItems[0].NotificationRequestItem
  if (eventCode === 'REFUND') {
    notificationRequestItem.additionalData['modification.action'] = 'refund'
  } else if (eventCode === 'CANCEL_OR_REFUND') {
    notificationRequestItem.additionalData['modification.action'] = 'cancel'
  }
  if (adyenConfig.enableHmacSignature) {
    notificationRequestItem.additionalData.hmacSignature =
      validator.calculateHmac(
        notificationRequestItem,
        adyenConfig.secretHmacKey
      )
  }

  return notification
}

module.exports = createNotificationPayload
