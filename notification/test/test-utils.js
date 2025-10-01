import _ from 'lodash'
import ip from 'ip'
import { hmacValidator } from '@adyen/api-library'
import config from '../src/config/config.js'
import { setupServer } from '../src/server.js'
import { setupNotificationResources } from '../src/setup.js'
import { setupExtensionResources } from '../../extension/src/setup.js'
import utils from '../src/utils/commons.js'
import ngrok from '@ngrok/ngrok'
import dotenv from 'dotenv'

dotenv.config()
const { address } = ip

const extensionPort = 3000
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

// node-fetch package doesn't support requests to localhost, therefore
// we need to provide the IP behind localhost
const localhostIp = address()

async function startIT() {
  await setupNotificationResources()
  if (!process.env.CI) {
    await setupLocalServer(8000)
  }
  let apiExtensionUrl = await setupExtensionNgrokTunnel()
  await setupExtensionResources(apiExtensionUrl)
}

function getNotificationURL() {
  if (!process.env.CI) {
    return `http://${localhostIp}:8000`
  }
  return process.env.CI_NOTIFICATION_URL
}

let server
async function setupLocalServer(testServerPort = 8000) {
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
    extensionServer.listen(extensionPort, async () => {
      resolve()
    })
  })
  extensionTunnel = await initNgrokTunnel(
    extensionPort,
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
      if (setDomain) {
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
  if (!process.env.CI) {
  server.close()
    extensionServer.close()
    await extensionTunnel.close()
  }
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
