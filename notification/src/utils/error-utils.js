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

function getErrorCause(err) {
  if (err instanceof VError) return err.cause()

  return err
}

export { isRecoverableError, getErrorCause }
