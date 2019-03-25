const { expect } = require('chai')
const { cloneDeep } = require('lodash')
const os = require('os')
const fetch = require('node-fetch')
const ctpClientBuilder = require('../../src/utils/ctp')
const iTSetUp = require('./integration-test-set-up')
const config = require('../../src/config/config')()
const notifications = require('../resources/notification')

// node-fetch package doesn't support requests to localhost, therefore
// we need to provide the IP behind localhost
const networkInterfaces = os.networkInterfaces()
const localhostIp = networkInterfaces.lo0[0].address

describe('notification module', () => {
  let ctpClient = ctpClientBuilder.get(config)

  before(async () => {
    await iTSetUp.startServer()
  })

  after(() => {
    iTSetUp.stopServer()
  })

  beforeEach(async () => {
    await iTSetUp.prepareProject(ctpClient)
  })

  afterEach(async () => {
    await iTSetUp.cleanupProject(ctpClient)
  })

  it('should update the transaction state when receives a correct notification', async () => {
    const { body: { results: [ paymentBefore ] }} = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentBefore.transactions).to.have.lengthOf(1)
    expect(paymentBefore.transactions[0].type).to.equal('Authorization')
    expect(paymentBefore.transactions[0].state).to.equal('Initial')
    expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

    // Simulating a notification from Adyen
    const response = await fetch(`http://${localhostIp}:8000`, {
      method: 'post',
      body:    JSON.stringify(notifications),
      headers: { 'Content-Type': 'application/json' },
    })
    const status = response.status
    const responseBody = await response.json()

    expect(responseBody).to.deep.equal({ notificationResponse: '[accepted]' })
    expect(status).to.equal(200)

    const { body: { results: [ paymentAfter ] }} = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentAfter.transactions).to.have.lengthOf(1)
    expect(paymentAfter.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter.transactions[0].state).to.equal('Success')
    expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
    const notification = notifications.notificationItems[0]
    expect(paymentAfter.interfaceInteractions[0].fields.notification).to.equal(JSON.stringify(notification))
  })

  it('should not update transaction when the notification event ' +
    'is not mapped to any CTP payment state', async () => {
    const { body: { results: [ paymentBefore ] }} = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentBefore.transactions).to.have.lengthOf(1)
    expect(paymentBefore.transactions[0].type).to.equal('Authorization')
    expect(paymentBefore.transactions[0].state).to.equal('Initial')
    expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

    const modifiedNotification = cloneDeep(notifications)
    modifiedNotification.notificationItems[0].NotificationRequestItem.eventCode = 'UNKNOWN_EVENT_CODE'
    // Simulating a notification from Adyen
    const response = await fetch(`http://${localhostIp}:8000`, {
      method: 'post',
      body:    JSON.stringify(modifiedNotification),
      headers: { 'Content-Type': 'application/json' },
    })
    const status = response.status
    const responseBody = await response.json()

    expect(responseBody).to.deep.equal({ notificationResponse: '[accepted]' })
    expect(status).to.equal(200)

    const { body: { results: [ paymentAfter ] }} = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentAfter.transactions).to.have.lengthOf(1)
    expect(paymentAfter.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter.transactions[0].state).to.equal('Initial')
    expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
    const notification = modifiedNotification.notificationItems[0]
    expect(paymentAfter.interfaceInteractions[0].fields.notification).to.equal(JSON.stringify(notification))
  })

  it('should response with success when payment does not exist on the platform', async () => {
    const { body: { results: [ paymentBefore ] }} = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentBefore.transactions).to.have.lengthOf(1)
    expect(paymentBefore.transactions[0].type).to.equal('Authorization')
    expect(paymentBefore.transactions[0].state).to.equal('Initial')
    expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

    const modifiedNotification = cloneDeep(notifications)
    modifiedNotification.notificationItems[0].NotificationRequestItem.merchantReference = 'NOT_EXISTING_PAYMENT'
    // Simulating a notification from Adyen
    const response = await fetch(`http://${localhostIp}:8000`, {
      method: 'post',
      body:    JSON.stringify(modifiedNotification),
      headers: { 'Content-Type': 'application/json' },
    })
    const status = response.status
    const responseBody = await response.json()

    expect(responseBody).to.deep.equal({ notificationResponse: '[accepted]' })
    expect(status).to.equal(200)

    const { body: { results: [ paymentAfter ] }} = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentAfter.transactions).to.have.lengthOf(1)
    expect(paymentAfter.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter.transactions[0].state).to.equal('Initial')
    expect(paymentAfter.interfaceInteractions).to.have.lengthOf(0)
  })
})
