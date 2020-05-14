const { hmacValidator } = require('@adyen/api-library')
const config = require('../config/config')()

/* eslint-disable new-cap */
const validator = new hmacValidator()

function hasValidHmacSignature (notification) {
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
  if (!notificationRequestItem.additionalData || !notificationRequestItem.additionalData.hmacSignature)
    return false

  return validator.validateHMAC(notificationRequestItem, config.adyen.secretHmacKey)
}

module.exports = { hasValidHmacSignature }
