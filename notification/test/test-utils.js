import _ from 'lodash'
import { hmacValidator } from '@adyen/api-library'
import config from '../src/config/config.js'
import { setupServer } from '../src/server.js'
import { setupNotificationResources } from '../src/setup.js'
import { setupExtensionResources } from '../../extension/src/setup.js'
import utils from '../src/utils/commons.js'
import ngrok from '@ngrok/ngrok'
import dotenv from 'dotenv'

dotenv.config()

let extensionTunnel
let extensionServer

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
  process.exit(1)
})

let originalGetAdyenConfigFn

function overrideAdyenConfig(newAdyenConfig) {
  originalGetAdyenConfigFn = config.getAdyenConfig
  config.getAdyenConfig = () => newAdyenConfig
}

function restoreAdyenConfig() {
  config.getAdyenConfig = originalGetAdyenConfigFn
}

async function buildMockErrorFromConcurrentModificationException() {
  const concurrentModificationError = await utils.readAndParseJsonFile(
    'test/resources/concurrent-modification-exception.json',
  )
  const error = new Error(concurrentModificationError.message)
  error.body = concurrentModificationError.body
  error.name = concurrentModificationError.name
  error.code = concurrentModificationError.code
  error.status = concurrentModificationError.status
  error.statusCode = concurrentModificationError.statusCode
  error.originalRequest = concurrentModificationError.originalRequest
  error.retryCount = concurrentModificationError.retryCount
  error.headers = concurrentModificationError.headers
  return error
}

async function startIT() {
  await setupNotificationResources()
  await setupLocalServer(process.env.NOTIFICATION_PORT)
  let apiExtensionUrl = await setupExtensionNgrokTunnel()
  await setupExtensionResources(apiExtensionUrl)
}

function getNotificationURL() {
  return `http://localhost:${process.env.NOTIFICATION_PORT}`
}

let server
async function setupLocalServer(testServerPort = '8000') {
  server = setupServer()
  return new Promise((resolve) => {
    server.listen(testServerPort, async () => {
      resolve()
    })
  })
}

async function setupExtensionNgrokTunnel() {
  const { setupServer: setupExtensionModuleServer } = await import(
    '../../extension/src/server.js'
  )
  extensionServer = await setupExtensionModuleServer()
  await new Promise((resolve) => {
    extensionServer.listen(process.env.EXTENSION_PORT, async () => {
      resolve()
    })
  })
  extensionTunnel = await initNgrokTunnel(
    process.env.EXTENSION_PORT,
    process.env.EXTENSION_TUNNEL_DOMAIN,
  )
  const apiExtensionBaseUrl = extensionTunnel.url().replace('http:', 'https:')
  overrideApiExtensionBaseUrlConfig(apiExtensionBaseUrl)

  return apiExtensionBaseUrl
}

async function initNgrokTunnel(port, subdomain) {
  let repeaterCounter = 0
  let setDomain = true
  let listener
  while (true) {
    try {
      const forwardOpts = {
        addr: port,
        authtoken: process.env.NGROK_AUTHTOKEN,
      }
      if (setDomain && subdomain) {
        forwardOpts.domain = subdomain
      }

      listener = await ngrok.forward(forwardOpts)
      break
    } catch (e) {
      setDomain = false
      if (repeaterCounter === 10) throw e
      repeaterCounter++
    }
  }

  return listener
}

function overrideApiExtensionBaseUrlConfig(apiExtensionBaseUrl) {
  const moduleConfig = config.getModuleConfig()
  moduleConfig.apiExtensionBaseUrl = apiExtensionBaseUrl
  config.getModuleConfig = function getModuleConfig() {
    return moduleConfig
  }
}

async function stopIT() {
  server.close()
  extensionServer.close()
  await extensionTunnel.close()
}

const validator = new hmacValidator()

function createNotificationPayload(
  commercetoolsProjectKey,
  adyenMerchantAccount,
  merchantReference,
  pspReference,
  eventCode = 'AUTHORISATION',
  success = 'true',
  originalReference,
) {
  const notification = {
    live: 'false',
    notificationItems: [
      {
        NotificationRequestItem: {
          additionalData: {
            'metadata.ctProjectKey': commercetoolsProjectKey,
          },
          amount: {
            currency: 'EUR',
            value: 10100,
          },
          eventCode,
          eventDate: '2019-01-30T18:16:22+01:00',
          merchantAccountCode: adyenMerchantAccount,
          merchantReference,
          operations: ['CANCEL', 'CAPTURE', 'REFUND'],
          paymentMethod: 'visa',
          pspReference,
          originalReference,
          success,
        },
      },
    ],
  }
  const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
  const notificationRequestItem =
    notification.notificationItems[0].NotificationRequestItem
  if (eventCode === 'REFUND') {
    notificationRequestItem.additionalData['modification.action'] = 'refund'
  } else if (eventCode === 'CANCEL_OR_REFUND') {
    notificationRequestItem.additionalData['modification.action'] = 'cancel'
  }
  if (adyenConfig.enableHmacSignature) {
    notificationRequestItem.additionalData.hmacSignature =
      validator.calculateHmac(
        notificationRequestItem,
        adyenConfig.secretHmacKey,
      )
  }

  return notification
}

async function ensurePayment(
  ctpClient,
  paymentKey,
  pspReference,
  commercetoolsProjectKey,
  adyenMerchantAccount,
) {
  const payment = await utils.readAndParseJsonFile(
    'test/resources/payment-draft.json',
  )
  const paymentDraft = _.cloneDeep(payment)
  paymentDraft.key = paymentKey
  paymentDraft.custom.fields.commercetoolsProjectKey = commercetoolsProjectKey
  paymentDraft.custom.fields.adyenMerchantAccount = adyenMerchantAccount
  if (pspReference) {
    paymentDraft.transactions[0].interactionId = pspReference
  }
  return ctpClient.create(ctpClient.builder.payments, paymentDraft)
}

export {
  overrideAdyenConfig,
  restoreAdyenConfig,
  buildMockErrorFromConcurrentModificationException,
  startIT,
  getNotificationURL,
  stopIT,
  createNotificationPayload,
  ensurePayment,
}
