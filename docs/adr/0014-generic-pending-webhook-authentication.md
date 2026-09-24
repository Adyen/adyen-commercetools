# 14. Generic Pending webhook authentication

Date: 2026-09-14

## Status

[Accepted]

## Context

The notification module registered and accepted a single Adyen webhook type, `standard`, whose integrity is verified
with HMAC signatures (`enableHmacSignature` / `secretHmacKey` per Adyen merchant account).

Adyen sends a [Generic Pending webhook](https://docs.adyen.com/development-resources/webhooks/webhook-types/#other-webhooks)
(`eventCode: PENDING`) whenever a payment ends in a pending state for a redirect payment method. This webhook type
cannot be HMAC-signed; Adyen only offers basic authentication over HTTPS for it. Consequently:

- `npm run setup-resources` never created the webhook, so `PENDING` events were never delivered.
- A `PENDING` event received while `enableHmacSignature` is enabled would have been rejected, as it carries no
  `additionalData.hmacSignature`.
- A `PENDING` event carries no `additionalData` at all, hence no `metadata.ctProjectKey`. Unless the webhook URL ends
  with the project key, the notification module cannot resolve the commercetools project and drops the event.

## Decision

- Basic authentication credentials are stored per Adyen merchant account under the `adyen` group of
  `ADYEN_INTEGRATION_CONFIG` as `authentication: { scheme: 'basic', username, password }`, mirroring the shape the
  extension module already uses for its own basic authentication. Webhooks are created per merchant account and incoming
  notifications already resolve their merchant account from `merchantAccountCode`, so authentication does not depend on
  `metadata.ctProjectKey`.
- Because the payload carries no project key, a new per-merchant attribute `ctpProjectKey` names the commercetools
  project the merchant account belongs to. It must match a configured project and is mandatory when `enableBasicAuth`
  is enabled. `setup-resources` registers the pending webhook at `<notificationBaseUrl>/notifications/<ctpProjectKey>`
  so that the existing URL-path fallback of the parser resolves the project; as a last resort the parser falls back to
  the merchant account's `ctpProjectKey`. This limits Generic Pending webhooks to one commercetools project per Adyen
  merchant account, which is acceptable since standard webhooks (which carry metadata) are unaffected.
- A new per-merchant boolean `enableBasicAuth` (default `false`) controls the feature, analogous to `enableHmacSignature`.
  Startup validation fails when it is enabled but the credentials are missing or incomplete, and also when an
  `authentication` object exists but is incomplete, so that a typo can not silently disable protection. This validation
  runs before the `setupNotificationResources` escape hatch because the setup command needs the credentials.
- `npm run setup-resources` registers a webhook of Adyen Management API type `pending-notification` with the configured
  username and password, pointing to `<notificationBaseUrl>/notifications/<ctpProjectKey>`, only when `enableBasicAuth`
  is enabled. Because Adyen never returns the stored password, the credentials are re-synced on every run.
- The notification handler branches on webhook type: `PENDING` notifications are validated against the basic
  authentication credentials taken from the HTTP `Authorization` header and skip HMAC validation; all other event codes
  keep the existing HMAC behaviour.
- A failed basic authentication is answered with HTTP `401` and aborts processing of the whole request, i.e. none of
  the notification items is processed or acknowledged with `[accepted]`. This deliberately differs from a failed HMAC
  validation, which is logged and acknowledged, because a 401 is the response Adyen expects for rejected credentials.
- Credential comparison is timing-safe and the decoded credential is split on the first colon only, so passwords may
  contain colons. Neither received nor configured credentials are ever logged.
- The `PENDING` event keeps its existing mapping in `adyen-events.json` (`transactionType: null`): the notification is
  stored as an interface interaction with status `pending` and no transaction is created or changed. Whether a
  commercetools transaction should be created for `PENDING` is an open question with Adyen and is deliberately
  deferred; if needed it is a data-only change of the `PENDING` row.

## Consequences

- Merchants can receive and trace pending redirect payments in commercetools via interface interactions.
- All four HTTP entry points (standalone server, AWS Lambda, Google Cloud Function, Azure Function) forward the
  `Authorization` header to the handler and map a 401 error to a 401 response instead of `[accepted]`. The Lambda
  wrapper reads the header case-insensitively.
- Basic authentication credentials become part of the deployment configuration and must be rotated in both
  `ADYEN_INTEGRATION_CONFIG` and Adyen (by re-running `npm run setup-resources`).
- Merchants enabling the feature must add `ctpProjectKey` to each Adyen merchant account; startup fails otherwise.
