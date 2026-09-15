import nock from 'nock'
import sinon from 'sinon'
import { expect } from 'chai'
import { ensureAdyenWebhooksForAllProjects } from '../../src/config/init/ensure-adyen-webhook.js'

import config from '../../src/config/config.js'
import { getLogger } from '../../src/utils/logger.js'

const MANAGEMENT_API_URL = 'https://management-test.adyen.com/v1'
const BASIC_AUTH = {
  scheme: 'basic',
  username: 'webhook-user',
  password: 'webhook-pass',
}

describe('verify ensure-adyen-webhook', () => {
  let adyenMerchantAccount0
  let adyenMerchantAccount1
  let adyenConfig0
  let logSpy

  beforeEach(() => {
    adyenMerchantAccount0 = config.getAllAdyenMerchantAccounts()[0]
    adyenMerchantAccount1 = config.getAllAdyenMerchantAccounts()[1]
    adyenConfig0 = config.getAdyenConfig(adyenMerchantAccount0)
    const adyenConfig1 = config.getAdyenConfig(adyenMerchantAccount1)

    adyenConfig0.notificationBaseUrl = 'https://test-notification'
    sinon
      .stub(config, 'getAdyenConfig')
      .withArgs(adyenMerchantAccount0)
      .returns(adyenConfig0)
      .withArgs(adyenMerchantAccount1)
      .returns(adyenConfig1)

    logSpy = sinon.spy()
    const logger = getLogger()
    logger.info = logSpy
    sinon.stub(getLogger(), 'child').returns(logger)
  })

  afterEach(() => {
    config.getAdyenConfig.restore()
    getLogger().child.restore()
    nock.cleanAll()
  })

  function mockListWebhooks(webhooks) {
    return nock(`${MANAGEMENT_API_URL}/merchants/${adyenMerchantAccount0}`)
      .get('/webhooks')
      .reply(200, { data: webhooks })
  }

  const existingStandardWebhook = {
    id: 'webhook-1',
    type: 'standard',
    url: 'https://test-notification',
    description: 'commercetools-adyen-integration notification webhook',
    active: true,
  }

  it('provided that webhook is existing in Adyen merchant account, no new webhook is created', async () => {
    mockListWebhooks([existingStandardWebhook])

    await ensureAdyenWebhooksForAllProjects()

    const message =
      'Webhook of type "standard" already existed with ID webhook-1. ' +
      'Skipping webhook creation and ensuring the webhook is active'
    sinon.assert.calledOnce(logSpy)
    sinon.assert.calledWith(logSpy, message)
  })

  it('when basic auth is disabled, no generic pending webhook is created', async () => {
    adyenConfig0.enableBasicAuth = false
    mockListWebhooks([existingStandardWebhook])
    const createScope = nock(
      `${MANAGEMENT_API_URL}/merchants/${adyenMerchantAccount0}`,
    )
      .post('/webhooks')
      .reply(200, { id: 'should-not-be-called' })

    await ensureAdyenWebhooksForAllProjects()

    expect(createScope.isDone()).to.be.false
    sinon.assert.calledOnce(logSpy)
  })

  it('when basic auth is enabled and no generic pending webhook exists, it is created with credentials', async () => {
    adyenConfig0.enableBasicAuth = true
    adyenConfig0.authentication = BASIC_AUTH
    // the webhook list is fetched once per webhook type
    mockListWebhooks([existingStandardWebhook])
    mockListWebhooks([existingStandardWebhook])

    let createRequestBody
    nock(`${MANAGEMENT_API_URL}/merchants/${adyenMerchantAccount0}`)
      .post('/webhooks', (body) => {
        createRequestBody = body
        return true
      })
      .reply(200, { id: 'pending-webhook-1' })

    await ensureAdyenWebhooksForAllProjects()

    expect(createRequestBody).to.deep.equal({
      type: 'pending-notification',
      url: 'https://test-notification',
      active: 'true',
      communicationFormat: 'json',
      description: 'commercetools-adyen-integration generic pending webhook',
      username: BASIC_AUTH.username,
      password: BASIC_AUTH.password,
    })
    sinon.assert.calledTwice(logSpy)
    sinon.assert.calledWith(
      logSpy,
      'New webhook of type "pending-notification" was created with ID pending-webhook-1',
    )
  })

  it('when the generic pending webhook already exists, its basic auth credentials are re-synced', async () => {
    adyenConfig0.enableBasicAuth = true
    adyenConfig0.authentication = BASIC_AUTH
    const existingPendingWebhook = {
      id: 'pending-webhook-1',
      type: 'pending-notification',
      url: 'https://test-notification',
      active: false,
      hasPassword: true,
    }
    mockListWebhooks([existingStandardWebhook, existingPendingWebhook])
    mockListWebhooks([existingStandardWebhook, existingPendingWebhook])

    let patchRequestBody
    const patchScope = nock(
      `${MANAGEMENT_API_URL}/merchants/${adyenMerchantAccount0}`,
    )
      .patch('/webhooks/pending-webhook-1', (body) => {
        patchRequestBody = body
        return true
      })
      .reply(200, { ...existingPendingWebhook, active: true })
    const createScope = nock(
      `${MANAGEMENT_API_URL}/merchants/${adyenMerchantAccount0}`,
    )
      .post('/webhooks')
      .reply(200, { id: 'should-not-be-called' })

    await ensureAdyenWebhooksForAllProjects()

    expect(createScope.isDone()).to.be.false
    expect(patchScope.isDone()).to.be.true
    expect(patchRequestBody).to.deep.equal({
      active: true,
      username: BASIC_AUTH.username,
      password: BASIC_AUTH.password,
    })
    sinon.assert.calledWith(
      logSpy,
      'Webhook of type "pending-notification" already existed with ID pending-webhook-1. ' +
        'Skipping webhook creation and ensuring the webhook is active',
    )
  })
})
