import { expect } from 'chai'
import nock from 'nock'
import sinon from 'sinon'
import { ensureAdyenWebhooksForAllProjects } from '../../src/config/init/ensure-adyen-webhook.js'
import config from '../../src/config/config.js'

describe('verify ensure-adyen-webhook', () => {
  afterEach(() => {
    config.getAdyenConfig.restore()
  })
  it('provided that webhook is existing in Adyen merchant account, no new webhook is created', async () => {
    const adyenMerchantAccount0 = config.getAllAdyenMerchantAccounts()[0]
    const adyenMerchantAccount1 = config.getAllAdyenMerchantAccounts()[1]
    const adyenConfig0 = config.getAdyenConfig(adyenMerchantAccount0)
    const adyenConfig1 = config.getAdyenConfig(adyenMerchantAccount1)

    adyenConfig0.notificationBaseUrl = 'https://test-notification'
    sinon
      .stub(config, 'getAdyenConfig')
      .withArgs(adyenMerchantAccount0)
      .returns(adyenConfig0)
      .withArgs(adyenMerchantAccount1)
      .returns(adyenConfig1)

    const fetchWebhookResponse = {
      data: [
        {
          id: 'webhook-1',
          type: 'standard',
          url: adyenConfig0.notificationBaseUrl,
          description: 'commercetools-adyen-integration notification webhook',
          active: true,
        },
      ],
    }

    nock(
      `https://management-test.adyen.com/v1/merchants/${adyenMerchantAccount0}`
    )
      .get('/webhooks')
      .reply(200, fetchWebhookResponse)

    const resultMap = await ensureAdyenWebhooksForAllProjects()
    expect(resultMap.length).to.not.equal(0)
    const result = resultMap.get(adyenMerchantAccount0)
    const { webhookId } = result
    expect(webhookId).to.equal('webhook-1')
  })
})
