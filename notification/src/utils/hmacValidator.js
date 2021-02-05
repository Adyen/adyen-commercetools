const { hmacValidator } = require('@adyen/api-library')
const config = require('../config/config')()

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
  const validationResult = validator.validateHMAC(
    notificationRequestItem,
    config.adyen.secretHmacKey
  )
  if (!validationResult)
    return (
      'Notification does not have a valid HMAC signature, ' +
      'please confirm that the notification was sent by Adyen, ' +
      'and was not modified during transmission.'
    )
  return null
}

module.exports = { validateHmacSignature }
