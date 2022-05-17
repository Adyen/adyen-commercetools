import { expect } from 'chai'
import fetch from 'node-fetch'
import ctpClientBuilder from '../../src/utils/ctp.js'
import config from '../../src/config/config.js'
import {
  getNotificationURL,
  ensurePayment,
  createNotificationPayload,
} from '../test-utils.js'

describe('::multitenancy::', () => {
  const [commercetoolsProjectKey1, commercetoolsProjectKey2] =
    config.getAllCtpProjectKeys()
  const [adyenMerchantAccount1, adyenMerchantAccount2] =
    config.getAllAdyenMerchantAccounts()

  let ctpClient1
  let ctpClient2
  let notificationURL

  before(async () => {
    ctpClient1 = await ctpClientBuilder.get(
      config.getCtpConfig(commercetoolsProjectKey1)
    )
    ctpClient2 = await ctpClientBuilder.get(
      config.getCtpConfig(commercetoolsProjectKey2)
    )
    notificationURL = getNotificationURL()
  })

  it.only('should process payment correctly when notifications are from different projects', async () => {
    const payment1Key = `notificationPayment1-${new Date().getTime()}`
    const payment2Key = `notificationPayment2-${new Date().getTime()}`
    await Promise.all([
      ensurePayment(
        ctpClient1,
        payment1Key,
        commercetoolsProjectKey1,
        adyenMerchantAccount1
      ),
      ensurePayment(
        ctpClient2,
        payment2Key,
        commercetoolsProjectKey2,
        adyenMerchantAccount2
      ),
    ])

    const notificationPayload1 = createNotificationPayload(
      commercetoolsProjectKey1,
      adyenMerchantAccount1,
      payment1Key
    )

    const notificationPayload2 = createNotificationPayload(
      commercetoolsProjectKey2,
      adyenMerchantAccount2,
      payment2Key
    )

    const [response1, response2] = await Promise.all([
      fetch(notificationURL, {
        method: 'post',
        body: JSON.stringify(notificationPayload1),
        headers: { 'Content-Type': 'application/json' },
      }),
      fetch(notificationURL, {
        method: 'post',
        body: JSON.stringify(notificationPayload2),
        headers: { 'Content-Type': 'application/json' },
      }),
    ])

    const response1Json = await response1.json()
    expect(response1Json).to.deep.equal({ notificationResponse: '[accepted]' })
    const response2Json = await response2.json()
    expect(response2Json).to.deep.equal({ notificationResponse: '[accepted]' })

    const { body: paymentAfter1 } = await ctpClient1.fetchByKey(
      ctpClient1.builder.payments,
      payment1Key
    )

    const { body: paymentAfter2 } = await ctpClient2.fetchByKey(
      ctpClient2.builder.payments,
      payment2Key
    )

    expect(paymentAfter1.transactions).to.have.lengthOf(1)
    expect(paymentAfter1.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter1.transactions[0].state).to.equal('Success')
    expect(paymentAfter1.interfaceInteractions).to.have.lengthOf(1)
    if (config.getModuleConfig().removeSensitiveData) {
      delete notificationPayload1.notificationItems[0].NotificationRequestItem
        .additionalData
    }
    expect(paymentAfter1.interfaceInteractions[0].fields.notification).to.equal(
      JSON.stringify(notificationPayload1.notificationItems[0])
    )

    expect(paymentAfter2.transactions).to.have.lengthOf(1)
    expect(paymentAfter2.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter2.transactions[0].state).to.equal('Success')
    expect(paymentAfter2.interfaceInteractions).to.have.lengthOf(1)
    if (config.getModuleConfig().removeSensitiveData) {
      delete notificationPayload2.notificationItems[0].NotificationRequestItem
        .additionalData
    }
    expect(paymentAfter2.interfaceInteractions[0].fields.notification).to.equal(
      JSON.stringify(notificationPayload2.notificationItems[0])
    )
  })
})
