import fetch from 'node-fetch'
import { serializeError } from 'serialize-error'
import { getLogger } from '../../utils/logger.js'
import config from '../config.js'
import { loadConfig } from '../config-loader.js'

const mainLogger = getLogger()

async function ensureAdyenWebhook(adyenApiKey, webhookUrl, merchantId) {
  try {
    const logger = mainLogger.child({
      adyen_merchant_id: merchantId,
    })

    const webhookConfig = {
      type: 'standard',
      url: webhookUrl,
      active: 'true',
      communicationFormat: 'json',
      description: 'commercetools-adyen-integration notification webhook',
    }

    const getWebhookResponse = await fetch(
      `https://management-test.adyen.com/v1/merchants/${merchantId}/webhooks`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': adyenApiKey,
        },
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
        `Webhook already existed with ID ${existingWebhook.id}. ` +
          'Skipping webhook creation and ensuring the webhook is active',
      )
      if (!existingWebhook.active)
        await fetch(
          `https://management-test.adyen.com/v1/merchants/${merchantId}/webhooks/${existingWebhook.id}`,
          {
            body: JSON.stringify({
              active: true,
            }),
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': adyenApiKey,
            },
          },
        )
      return existingWebhook.id
    }

    const createWebhookResponse = await fetch(
      `https://management-test.adyen.com/v1/merchants/${merchantId}/webhooks`,
      {
        body: JSON.stringify(webhookConfig),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': adyenApiKey,
        },
      },
    )

    const createWebhookResponseJson = await createWebhookResponse.json()
    const webhookId = createWebhookResponseJson.id

    logger.info(`New webhook was created with ID ${webhookId}`)
    return webhookId
  } catch (err) {
    throw Error(
      `Failed to ensure adyen webhook for project ${merchantId}.` +
        `Error: ${JSON.stringify(serializeError(err))}`,
    )
  }
}

async function ensureAdyenHmac(adyenApiKey, merchantId, webhookId) {
  const logger = mainLogger.child({
    adyen_merchant_id: merchantId,
  })

  const generateHmacResponse = await fetch(
    `https://management-test.adyen.com/v1/merchants/${merchantId}/webhooks/${webhookId}/generateHmac`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': adyenApiKey,
      },
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
      )
      if (adyenConfig.enableHmacSignature && !adyenConfig.secretHmacKey) {
        const hmacKey = await ensureAdyenHmac(
          adyenConfig.apiKey,
          adyenMerchantId,
          webhookId,
        )
        jsonConfig.adyen[adyenMerchantId].secretHmacKey = hmacKey
      }
    }
  }
}

export { ensureAdyenWebhooksForAllProjects }
