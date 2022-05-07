const fetch = require('node-fetch')
const pMap = require('p-map')
const config = require('../config')

async function ensureWebhooks() {
  const merchantAccounts = config.getAllAdyenMerchantAccounts()
  await pMap(
    merchantAccounts,
    async (merchantAccount) => {
      const adyenConfig = config.getAdyenConfig(merchantAccount)

      const request = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': adyenConfig.apiKey,
        },
      }

      const webhookUrl = `${adyenConfig.apiManagementUrl}/merchants/${merchantAccount}/webhooks`
      const getWebhookResponse = await fetch(webhookUrl, request)
      const getWebhookResponseJson = await getWebhookResponse.json()

      const existingWebhook = getWebhookResponseJson.data.find(
        (hook) =>
          hook.type === 'standard' &&
          hook.url === adyenConfig.notificationModuleBaseUrl
      )
      if (!existingWebhook) {
        const createWebhookRequestBody = {
          type: 'standard',
          url: 'https://www.test.com',
          active: 'true',
          communicationFormat: 'json',
        }

        const createWebhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          body: JSON.stringify(createWebhookRequestBody),
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': adyenConfig.apiKey,
          },
        })
        const createWebhookResponseJson = await createWebhookResponse.json()

        console.log(createWebhookResponseJson)
      }
    },
    { concurrency: 3 }
  )
}

module.exports = { ensureWebhooks }
