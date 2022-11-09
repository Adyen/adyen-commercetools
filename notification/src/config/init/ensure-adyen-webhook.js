import fetch from 'node-fetch'
import {getLogger} from "../../utils/logger.js"
import config from "../config.js";

const mainLogger = getLogger()

async function ensureAdyenWebhook(adyenApiKey, webhookUrl, merchantId) {
  const webhookConfig = {
    "type": "standard",
    "url": webhookUrl,
    "active": "true",
    "communicationFormat": "json",
    "description": "commercetools-adyen-integration notification webhook"
  }

  const getWebhookResponse = await fetch(`https://management-test.adyen.com/v1/merchants/${merchantId}/webhooks`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': adyenApiKey
    },
  })
  const getWebhookResponseResponseJson = await getWebhookResponse.json()

  const existingWebhook = getWebhookResponseResponseJson.data
    .find(webhook => webhook.url === webhookConfig.url && webhook.type === webhookConfig.type)

  if (existingWebhook) {
    mainLogger.info(`Webhook already existed with ID ${existingWebhook.id}`)
    return
  }

  const createWebhookResponse = await fetch(`https://management-test.adyen.com/v1/merchants/${merchantId}/webhooks`, {
    body: JSON.stringify(webhookConfig),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': adyenApiKey
    }
  })

  const createWebhookResponseJson = await createWebhookResponse.json()
  const webhookId = createWebhookResponseJson.id

  mainLogger.info(`New webhook was created with ID ${webhookId}`)

  const generateHmacResponse = await fetch(
    `https://management-test.adyen.com/v1/merchants/${merchantId}/webhooks/${webhookId}/generateHmac`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': adyenApiKey
    },
  })

  const generateHmacResponseJson = await generateHmacResponse.json()
  const { hmacKey } = generateHmacResponseJson

  mainLogger.info(`HMAC key generated ${hmacKey}`)
}

async function ensureAdyenWebhooksForAllProjects() {
  const adyenMerchantAccounts = config.getAllAdyenMerchantAccounts()
  for (const adyenMerchantId of adyenMerchantAccounts) {
    const adyenConfig = config.getAdyenConfig(adyenMerchantId)
    await ensureAdyenWebhook(adyenConfig.apiKey, adyenConfig.notificationBaseUrl, adyenMerchantId)
  }
}


export {
  ensureAdyenWebhooksForAllProjects
}
