const fetch = require('node-fetch')
const _ = require('lodash')
const pMap = require('p-map')
const config = require('../config')

async function ensureHmacKeys(logger) {
  const moduleConfig = config.getModuleConfig()
  const adyenMerchantAccounts = config.getAllAdyenMerchantAccounts()
  const { apiManagementUrl } = moduleConfig
  await pMap(
    adyenMerchantAccounts,
    async (adyenMerchantAccount) => {
      const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
      if (
        adyenConfig.enableHmacSignature &&
        _.isEmpty(adyenConfig.secretHmacKey) &&
        adyenConfig.generateHmacKey
      ) {
        logger.info(`[${adyenMerchantAccount}]: Generating new HMAC key`)
        await generateHmacKey({
          adyenMerchantAccount,
          adyenConfig,
          apiManagementUrl,
          logger,
        })
      }
    },
    { concurrency: 3 }
  )
}

async function generateHmacKey({
  adyenMerchantAccount,
  adyenConfig,
  apiManagementUrl,
  logger,
}) {
  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': adyenConfig.apiKey,
    },
  }

  const webhookUrl = `${apiManagementUrl}/merchants/${adyenMerchantAccount}/webhooks`
  const getWebhookResponse = await fetch(webhookUrl, request)
  const getWebhookResponseJson = await getWebhookResponse.json()

  const existingWebhook = getWebhookResponseJson.data.find(
    (hook) =>
      hook.type === 'standard' &&
      hook.url === adyenConfig.notificationModuleBaseUrl
  )

  if (existingWebhook) {
    const generateHmacLink = `${apiManagementUrl}/merchants/${adyenMerchantAccount}/webhooks/${existingWebhook.id}/generateHmac`

    const generateHmacResponse = await fetch(generateHmacLink, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': adyenConfig.apiKey,
      },
    })
    const generateHmacResponseJson = await generateHmacResponse.json()
    const { hmacKey } = generateHmacResponseJson
    adyenConfig.secretHmacKey = hmacKey

    logger.info(`[${adyenMerchantAccount}]: Your new HMAC key is ${hmacKey}`)
  } else {
    throw new Error(
      `[${adyenMerchantAccount}]: The "secretHmacKey" cannot be generated because the Standard webhook for the URL` +
        `${adyenConfig.notificationModuleBaseUrl} is missing. Please create the appropriate webhook first OR` +
        'manually generate a secret HMAC key in Adyen Customer Area' +
        'OR set "enableHmacSignature=false" to disable the verification feature.'
    )
  }
}

module.exports = { ensureHmacKeys }
