import { hmacValidator } from '@adyen/api-library'
import config from '../config/config.js'

/* eslint-disable new-cap */
const validator = new hmacValidator()

function validateHmacSignature(notification) {
  /* By verifying this (hmacSignature) signature, We confirm that the notification was sent by Adyen,
  and was not modified during transmission.
  A sample representation will look like:
  {
     "NotificationRequestItem":{
        "additionalData":{
           "hmacSignature":"+JWKfq4ynALK+FFzGgHnp1jSMQJMBJeb87dlph24sXw="
        },
      ...
     }
  }
  */
  const notificationRequestItem = notification.NotificationRequestItem
  if (!notificationRequestItem.additionalData)
    return (
      'Notification does not contain the required field ' +
      '"NotificationRequestItem.additionalData". Please check if HMAC is configured correctly or contact Adyen.'
    )
  if (!notificationRequestItem.additionalData.hmacSignature)
    return (
      'Notification does not contain the required field ' +
      '"NotificationRequestItem.additionalData.hmacSignature". ' +
      'Please check if HMAC is configured correctly or contact Adyen.'
    )
  const adyenMerchantAccount =
    notification.NotificationRequestItem.merchantAccountCode
  const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
  const validationResult = validator.validateHMAC(
    notificationRequestItem,
    adyenConfig.secretHmacKey,
  )
  if (!validationResult)
    return (
      'Notification does not have a valid HMAC signature, ' +
      'please confirm that the notification was sent by Adyen, ' +
      'and was not modified during transmission.'
    )
  return null
}

export { validateHmacSignature }
