import fetch from 'node-fetch'
import { serializeError } from 'serialize-error'
import { getLogger } from '../../utils/logger.js'
import config from '../config.js'
import { loadConfig } from '../config-loader.js'

const mainLogger = getLogger()

const ADYEN_MANAGEMENT_API_BASE_URL = 'https://management-test.adyen.com/v1'

const STANDARD_WEBHOOK = {
  type: 'standard',
  description: 'commercetools-adyen-integration notification webhook',
}

// Adyen generic pending webhooks (eventCode PENDING) can not be HMAC-signed,
// they are protected with basic authentication over HTTPS instead.
const GENERIC_PENDING_WEBHOOK = {
  type: 'pending-notification',
  description: 'commercetools-adyen-integration generic pending webhook',
}

function _buildRequestHeaders(adyenApiKey) {
  return {
    'Content-Type': 'application/json',
    'X-Api-Key': adyenApiKey,
  }
}

/**
 * Ensures that a webhook of the given type pointing to `webhookUrl` exists and is active
 * in the Adyen merchant account.
 * @param adyenApiKey Adyen API key with Management API permissions
 * @param webhookUrl publicly available URL of the notification module
 * @param merchantId Adyen merchant account
 * @param webhook shape of the webhook: `type`, `description` and optional basic auth `username` / `password`
 * @returns {Promise<string>} the webhook ID
 */
async function ensureAdyenWebhook(
  adyenApiKey,
  webhookUrl,
  merchantId,
  {
    type = STANDARD_WEBHOOK.type,
    description = STANDARD_WEBHOOK.description,
    username,
    password,
  } = {},
) {
  try {
    const logger = mainLogger.child({
      adyen_merchant_id: merchantId,
    })

    const hasBasicAuthCredentials = Boolean(username && password)
    const basicAuthConfig = hasBasicAuthCredentials
      ? { username, password }
      : {}

    const webhookConfig = {
      type,
      url: webhookUrl,
      active: 'true',
      communicationFormat: 'json',
      description,
      ...basicAuthConfig,
    }

    const getWebhookResponse = await fetch(
      `${ADYEN_MANAGEMENT_API_BASE_URL}/merchants/${merchantId}/webhooks`,
      {
        method: 'GET',
        headers: _buildRequestHeaders(adyenApiKey),
      },
    )
    const getWebhookResponseJson = await getWebhookResponse.json()

    const existingWebhook = getWebhookResponseJson.data?.find(
      (webhook) =>
        webhook.url === webhookConfig.url &&
        webhook.type === webhookConfig.type,
    )

    if (existingWebhook) {
      logger.info(
        `Webhook of type "${type}" already existed with ID ${existingWebhook.id}. ` +
          'Skipping webhook creation and ensuring the webhook is active',
      )
      if (hasBasicAuthCredentials) {
        // Adyen never returns the configured password, so the credentials are always re-synced
        // to make sure that rotated credentials in the configuration are propagated to Adyen.
        await fetch(
          `${ADYEN_MANAGEMENT_API_BASE_URL}/merchants/${merchantId}/webhooks/${existingWebhook.id}`,
          {
            body: JSON.stringify({
              active: true,
              ...basicAuthConfig,
            }),
            method: 'PATCH',
            headers: _buildRequestHeaders(adyenApiKey),
          },
        )
      } else if (!existingWebhook.active)
        await fetch(
          `${ADYEN_MANAGEMENT_API_BASE_URL}/merchants/${merchantId}/webhooks/${existingWebhook.id}`,
          {
            body: JSON.stringify({
              active: true,
            }),
            method: 'POST',
            headers: _buildRequestHeaders(adyenApiKey),
          },
        )
      return existingWebhook.id
    }

    const createWebhookResponse = await fetch(
      `${ADYEN_MANAGEMENT_API_BASE_URL}/merchants/${merchantId}/webhooks`,
      {
        body: JSON.stringify(webhookConfig),
        method: 'POST',
        headers: _buildRequestHeaders(adyenApiKey),
      },
    )

    const createWebhookResponseJson = await createWebhookResponse.json()
    const webhookId = createWebhookResponseJson.id

    logger.info(
      `New webhook of type "${type}" was created with ID ${webhookId}`,
    )
    return webhookId
  } catch (err) {
    throw Error(
      `Failed to ensure adyen webhook for project ${merchantId}.` +
        `Error: ${JSON.stringify(serializeError(err))}`,
      { cause: err },
    )
  }
}

async function ensureAdyenHmac(adyenApiKey, merchantId, webhookId) {
  const logger = mainLogger.child({
    adyen_merchant_id: merchantId,
  })

  const generateHmacResponse = await fetch(
    `${ADYEN_MANAGEMENT_API_BASE_URL}/merchants/${merchantId}/webhooks/${webhookId}/generateHmac`,
    {
      method: 'POST',
      headers: _buildRequestHeaders(adyenApiKey),
    },
  )

  const generateHmacResponseJson = await generateHmacResponse.json()
  const { hmacKey } = generateHmacResponseJson

  logger.info(`New HMAC was generated: ${hmacKey}`)

  return hmacKey
}

async function ensureAdyenWebhooksForAllProjects() {
  const adyenMerchantAccounts = config.getAllAdyenMerchantAccounts()
  const jsonConfig = loadConfig()

  for (const adyenMerchantId of adyenMerchantAccounts) {
    const adyenConfig = config.getAdyenConfig(adyenMerchantId)

    if (adyenConfig.notificationBaseUrl) {
      const webhookId = await ensureAdyenWebhook(
        adyenConfig.apiKey,
        adyenConfig.notificationBaseUrl,
        adyenMerchantId,
        STANDARD_WEBHOOK,
      )
      if (adyenConfig.enableHmacSignature && !adyenConfig.secretHmacKey) {
        const hmacKey = await ensureAdyenHmac(
          adyenConfig.apiKey,
          adyenMerchantId,
          webhookId,
        )
        jsonConfig.adyen[adyenMerchantId].secretHmacKey = hmacKey
      }

      if (adyenConfig.enableBasicAuth) {
        // The generic pending webhook is only registered when basic auth is enabled,
        // as Adyen requires the endpoint to be protected and HMAC is not supported for it.
        await ensureAdyenWebhook(
          adyenConfig.apiKey,
          adyenConfig.notificationBaseUrl,
          adyenMerchantId,
          {
            ...GENERIC_PENDING_WEBHOOK,
            username: adyenConfig.authentication.username,
            password: adyenConfig.authentication.password,
          },
        )
      }
    }
  }
}

export { ensureAdyenWebhooksForAllProjects }
