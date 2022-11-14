import fetch from 'node-fetch'
import { serializeError } from 'serialize-error'
import { getLogger } from '../../utils/logger.js'
import config from '../config.js'

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
      }
    )
    const getWebhookResponseResponseJson = await getWebhookResponse.json()

    const existingWebhook = getWebhookResponseResponseJson.data?.find(
      (webhook) =>
        webhook.url === webhookConfig.url && webhook.type === webhookConfig.type
    )

    if (existingWebhook) {
      logger.info(
        `Webhook already existed with ID ${existingWebhook.id}. Skipping webhook creation...`
      )
      return
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
      }
    )

    const createWebhookResponseJson = await createWebhookResponse.json()
    const webhookId = createWebhookResponseJson.id

    logger.info(`New webhook was created with ID ${webhookId}`)
  } catch (err) {
    throw Error(
      `Failed to ensure adyen webhook for project ${merchantId}.` +
        `Error: ${JSON.stringify(serializeError(err))}`
    )
  }

  // todo: will be done later
  // const generateHmacResponse = await fetch(
  //   `https://management-test.adyen.com/v1/merchants/${merchantId}/webhooks/${webhookId}/generateHmac`, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'X-Api-Key': adyenApiKey
  //   },
  // })
  //
  // const generateHmacResponseJson = await generateHmacResponse.json()
  // const { hmacKey } = generateHmacResponseJson
  //
  // logger.info(`HMAC key generated ${hmacKey}`)
}

async function ensureAdyenWebhooksForAllProjects() {
  const adyenMerchantAccounts = config.getAllAdyenMerchantAccounts()
  for (const adyenMerchantId of adyenMerchantAccounts) {
    const adyenConfig = config.getAdyenConfig(adyenMerchantId)
    if (adyenConfig.notificationBaseUrl) {
      await ensureAdyenWebhook(
        adyenConfig.apiKey,
        adyenConfig.notificationBaseUrl,
        adyenMerchantId
      )
    }
  }
}

export { ensureAdyenWebhooksForAllProjects }
