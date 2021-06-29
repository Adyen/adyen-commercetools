const { expect } = require('chai')
const { address } = require('ip')
const { cloneDeep } = require('lodash')
const fetch = require('node-fetch')
const ctpClientBuilder = require('../../src/utils/ctp')
const iTSetUp = require('./integration-test-set-up')
const config = require('../../src/config/config')
const notifications = require('../resources/notification.json')

const localhostIp = address()

describe('::multitenancy::', () => {
  let commercetoolsProjectKey1
  let commercetoolsProjectKey2
  let adyenMerchantAccount1
  let adyenMerchantAccount2
  let ctpClient1
  let ctpClient2

  beforeEach(async () => {
    ;[
      commercetoolsProjectKey1,
      commercetoolsProjectKey2,
    ] = config.getAllCtpProjectKeys()
    ;[
      adyenMerchantAccount1,
      adyenMerchantAccount2,
    ] = config.getAllAdyenMerchantAccounts()
    ctpClient1 = ctpClientBuilder.get(
      config.getCtpConfig(commercetoolsProjectKey1)
    )
    ctpClient2 = ctpClientBuilder.get(
      config.getCtpConfig(commercetoolsProjectKey2)
    )
    await iTSetUp.prepareProject(ctpClient1)
    await iTSetUp.prepareProject(ctpClient2)
    await iTSetUp.startServer()
  })

  afterEach(async () => {
    iTSetUp.stopServer()
    await iTSetUp.cleanupProject(ctpClient1)
    await iTSetUp.cleanupProject(ctpClient2)
  })

  it('should process payment correctly when notifications are from different projects', async () => {
    const modifiedNotification1 = cloneDeep(notifications)
    const modifiedNotification2 = cloneDeep(notifications)

    modifiedNotification1.notificationItems[0].NotificationRequestItem.additionalData = {
      'metadata.ctProjectKey': commercetoolsProjectKey1,
    }
    modifiedNotification1.notificationItems[0].NotificationRequestItem.merchantAccountCode = adyenMerchantAccount1

    modifiedNotification2.notificationItems[0].NotificationRequestItem.additionalData = {
      'metadata.ctProjectKey': commercetoolsProjectKey2,
    }
    modifiedNotification2.notificationItems[0].NotificationRequestItem.merchantAccountCode = adyenMerchantAccount2

    const [response1, response2] = await Promise.all([
      fetch(`http://${localhostIp}:8000`, {
        method: 'post',
        body: JSON.stringify(modifiedNotification1),
        headers: { 'Content-Type': 'application/json' },
      }),
      fetch(`http://${localhostIp}:8000`, {
        method: 'post',
        body: JSON.stringify(modifiedNotification2),
        headers: { 'Content-Type': 'application/json' },
      }),
    ])

    const response1Json = await response1.json()
    expect(response1Json).to.deep.equal({ notificationResponse: '[accepted]' })
    const response2Json = await response2.json()
    expect(response2Json).to.deep.equal({ notificationResponse: '[accepted]' })

    const {
      body: {
        results: [paymentAfter1],
      },
    } = await ctpClient1.fetch(ctpClient1.builder.payments)

    const {
      body: {
        results: [paymentAfter2],
      },
    } = await ctpClient2.fetch(ctpClient2.builder.payments)

    expect(paymentAfter1.transactions).to.have.lengthOf(1)
    expect(paymentAfter1.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter1.transactions[0].state).to.equal('Success')
    expect(paymentAfter1.interfaceInteractions).to.have.lengthOf(1)
    const notificationItem1 = modifiedNotification1.notificationItems[0]
    expect(paymentAfter1.interfaceInteractions[0].fields.notification).to.equal(
      JSON.stringify(notificationItem1)
    )

    expect(paymentAfter2.transactions).to.have.lengthOf(1)
    expect(paymentAfter2.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter2.transactions[0].state).to.equal('Success')
    expect(paymentAfter2.interfaceInteractions).to.have.lengthOf(1)
    const notificationItem2 = modifiedNotification2.notificationItems[0]
    expect(paymentAfter2.interfaceInteractions[0].fields.notification).to.equal(
      JSON.stringify(notificationItem2)
    )
  })
})
