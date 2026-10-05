import VError from 'verror'

/*
 * recoverable: notification delivery can be retried by Adyen (return 500)
 * non recoverable: notification delivery can not be retried by Adyen
 * as it most probably would fail again (return "accepted")
 *
 * If commercetools status code is defined and is 5xx then return `500` to Adyen -> recoverable
 * If during communication with commercetools we got a `NetworkError` then return `500` -> recoverable
 * If commercetools status code is not OK but also not 5xx or 409 then return `accepted` -> non recoverable
 * @param err
 * @returns {boolean}
 */
function isRecoverableError(err) {
  const cause = getErrorCause(err)
  const statusCode = cause?.statusCode
  return (
    statusCode !== null &&
    (statusCode < 200 || statusCode === 409 || statusCode >= 500)
  )
}

/*
 * Basic authentication of a generic pending webhook failed (HTTP 401).
 * Such notifications must not be acknowledged with "[accepted]".
 *
 * A dedicated class is used (instead of matching on `statusCode === 401`) so that
 * a 401 returned by commercetools (e.g. rotated client secret) is not mistaken
 * for a webhook authentication failure and keeps its existing "[accepted]" handling.
 */
class UnauthorizedError extends Error {
  constructor(message) {
    super(message)
    this.name = 'UnauthorizedError'
    this.statusCode = 401
  }
}

function isUnauthorizedError(err) {
  return (
    err instanceof UnauthorizedError ||
    getErrorCause(err) instanceof UnauthorizedError
  )
}

function getErrorCause(err) {
  if (err instanceof VError) return err.cause()

  return err
}

export {
  isRecoverableError,
  isUnauthorizedError,
  getErrorCause,
  UnauthorizedError,
}
