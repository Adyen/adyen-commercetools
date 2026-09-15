import { timingSafeEqual } from 'crypto'
import config from '../config/config.js'

const GENERIC_PENDING_EVENT_CODE = 'PENDING'

/**
 * Adyen generic pending webhooks (eventCode PENDING) do not support HMAC signatures.
 * They are protected with basic authentication over HTTPS instead.
 */
function isGenericPendingNotification(notification) {
  return (
    notification?.NotificationRequestItem?.eventCode ===
    GENERIC_PENDING_EVENT_CODE
  )
}

/**
 * Validates the basic authentication credentials of a generic pending webhook request
 * against the credentials configured for the Adyen merchant account of the notification.
 * @param notification single notification item (`{ NotificationRequestItem: {...} }`)
 * @param authorizationHeader value of the HTTP `Authorization` request header
 * @returns {string|null} error message when validation fails, otherwise null
 */
function validateBasicAuthentication(notification, authorizationHeader) {
  const adyenMerchantAccount =
    notification.NotificationRequestItem.merchantAccountCode
  const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
  const storedCredential = adyenConfig.authentication

  if (!storedCredential?.username || !storedCredential?.password)
    return (
      'Basic authentication is enabled but no "authentication" credentials are configured ' +
      'for the Adyen merchant account. Please update the configuration.'
    )

  const receivedCredential = _parseBasicAuthorizationHeader(authorizationHeader)
  if (!receivedCredential)
    return (
      'Notification does not contain a valid "Authorization" header with basic authentication credentials. ' +
      'Please check if basic authentication is configured correctly in the Adyen webhook or contact Adyen.'
    )

  if (
    !_safeEquals(storedCredential.username, receivedCredential.username) ||
    !_safeEquals(storedCredential.password, receivedCredential.password)
  )
    return (
      'Notification does not have valid basic authentication credentials, ' +
      'please confirm that the notification was sent by Adyen ' +
      'and that the configured username and password match the Adyen webhook settings.'
    )

  return null
}

/**
 * Parses an `Authorization: Basic <base64(username:password)>` header value.
 * @returns {{username: string, password: string}|null} null when the header is missing or malformed
 */
function _parseBasicAuthorizationHeader(authorizationHeader) {
  if (typeof authorizationHeader !== 'string') return null

  const [scheme, encodedCredential, ...rest] = authorizationHeader
    .trim()
    .split(/\s+/)
  if (
    !scheme ||
    scheme.toLowerCase() !== 'basic' ||
    !encodedCredential ||
    rest.length > 0
  )
    return null

  const decodedCredential = Buffer.from(encodedCredential, 'base64').toString(
    'utf8',
  )
  // the password itself may contain colons, so split only on the first one
  const separatorIndex = decodedCredential.indexOf(':')
  if (separatorIndex < 0) return null

  return {
    username: decodedCredential.substring(0, separatorIndex),
    password: decodedCredential.substring(separatorIndex + 1),
  }
}

function _safeEquals(expected, actual) {
  const expectedBuffer = Buffer.from(String(expected), 'utf8')
  const actualBuffer = Buffer.from(String(actual), 'utf8')
  if (expectedBuffer.length !== actualBuffer.length) return false
  return timingSafeEqual(expectedBuffer, actualBuffer)
}

export { isGenericPendingNotification, validateBasicAuthentication }
