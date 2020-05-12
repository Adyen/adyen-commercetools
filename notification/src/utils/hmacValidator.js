const config = require('../config/config')()
const {hmacValidator} = require('@adyen/api-library')
const validator = new hmacValidator()

function hasValidHmacSignature(notification) {
  if (!config.adyen.enableHmacSignature)
    return true

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
  const notificationRequestItem = notification[0].NotificationRequestItem
  if (!notificationRequestItem.additionalData || !notificationRequestItem.additionalData.hmacSignature)
    return false;

  return validator.validateHMAC(notificationRequestItem, config.adyen.secretHMACKey)
}

module.exports = { hasValidHmacSignature }
