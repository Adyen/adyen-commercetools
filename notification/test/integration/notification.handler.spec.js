import { expect } from 'chai'
import fetch from 'node-fetch'
import ctpClientBuilder from '../../src/utils/ctp.js'
import config from '../../src/config/config.js'
import {
  getNotificationURL,
  overrideAdyenConfig,
  ensurePayment,
  createNotificationPayload,
} from '../test-utils.js'

describe('notification module', () => {
  const [commercetoolsProjectKey] = config.getAllCtpProjectKeys()
  const [adyenMerchantAccount] = config.getAllAdyenMerchantAccounts()

  let notificationURL
  let ctpClient
  before(async () => {
    ctpClient = await ctpClientBuilder.get(
      config.getCtpConfig(commercetoolsProjectKey)
    )
    notificationURL = getNotificationURL()
  })

  it(
    'should update the pending authorization transaction state to success state ' +
      'when receives a successful AUTHORIZATION notification',
    async () => {
      const paymentKey = `notificationPayment-${new Date().getTime()}`
      const { body: paymentBefore } = await ensurePayment(
        ctpClient,
        paymentKey,
        commercetoolsProjectKey,
        adyenMerchantAccount
      )
      expect(paymentBefore.transactions).to.have.lengthOf(1)
      expect(paymentBefore.transactions[0].type).to.equal('Authorization')
      expect(paymentBefore.transactions[0].state).to.equal('Pending')
      expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

      const notificationPayload = createNotificationPayload(
        commercetoolsProjectKey,
        adyenMerchantAccount,
        paymentKey
      )

      // Simulating a notification from Adyen
      const response = await fetch(notificationURL, {
        method: 'post',
        body: JSON.stringify(notificationPayload),
        headers: { 'Content-Type': 'application/json' },
      })
      const { status } = response
      const responseBody = await response.json()

      expect(responseBody).to.deep.equal({ notificationResponse: '[accepted]' })
      expect(status).to.equal(200)

      const { body: paymentAfter } = await ctpClient.fetchByKey(
        ctpClient.builder.payments,
        paymentKey
      )
      expect(paymentAfter.transactions).to.have.lengthOf(1)
      expect(paymentAfter.paymentMethodInfo.method).to.equal('visa')
      expect(paymentAfter.transactions[0].type).to.equal('Authorization')
      expect(paymentAfter.transactions[0].state).to.equal('Success')
      expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
      if (config.getModuleConfig().removeSensitiveData) {
        delete notificationPayload.notificationItems[0].NotificationRequestItem
          .additionalData
      }
      expect(
        paymentAfter.interfaceInteractions[0].fields.notification
      ).to.equal(JSON.stringify(notificationPayload.notificationItems[0]))
    }
  )

  it('should add a charge transaction when receives a successful manual CAPTURE notification', async () => {
    const paymentKey = `notificationPayment-${new Date().getTime()}`
    const { body: paymentBefore } = await ensurePayment(
      ctpClient,
      paymentKey,
      commercetoolsProjectKey,
      adyenMerchantAccount
    )
    expect(paymentBefore.transactions).to.have.lengthOf(1)
    expect(paymentBefore.transactions[0].type).to.equal('Authorization')
    expect(paymentBefore.transactions[0].state).to.equal('Pending')
    expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

    // update payment transaction
    const actions = [
      {
        action: 'changeTransactionState',
        state: 'Success',
        transactionId: paymentBefore.transactions[0].id,
      },
    ]

    const { body: updatedPayment } = await ctpClient.update(
      ctpClient.builder.payments,
      paymentBefore.id,
      paymentBefore.version,
      actions
    )

    expect(updatedPayment.transactions).to.have.lengthOf(1)
    expect(updatedPayment.transactions[0].type).to.equal('Authorization')
    expect(updatedPayment.transactions[0].state).to.equal('Success')

    const notificationPayload = createNotificationPayload(
      commercetoolsProjectKey,
      adyenMerchantAccount,
      paymentKey,
      'CAPTURE',
      _generateRandomNumber()
    )

    // Simulating a notification from Adyen
    const response = await fetch(notificationURL, {
      method: 'post',
      body: JSON.stringify(notificationPayload),
      headers: { 'Content-Type': 'application/json' },
    })
    const { status } = response
    const responseBody = await response.json()

    expect(responseBody).to.deep.equal({ notificationResponse: '[accepted]' })
    expect(status).to.equal(200)

    const { body: paymentAfter } = await ctpClient.fetchByKey(
      ctpClient.builder.payments,
      paymentKey
    )
    expect(paymentAfter.transactions).to.have.lengthOf(2)
    expect(paymentAfter.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter.transactions[0].state).to.equal('Success')
    expect(paymentAfter.transactions[1].type).to.equal('Charge')
    expect(paymentAfter.transactions[1].state).to.equal('Success')

    expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
    if (config.getModuleConfig().removeSensitiveData) {
      delete notificationPayload.notificationItems[0].NotificationRequestItem
        .additionalData
    }
    expect(paymentAfter.interfaceInteractions[0].fields.notification).to.equal(
      JSON.stringify(notificationPayload.notificationItems[0])
    )
  })

  it(
    'should not update transaction when the notification event ' +
      'is not mapped to any CTP payment state',
    async () => {
      const paymentKey = `notificationPayment-${new Date().getTime()}`
      const { body: paymentBefore } = await ensurePayment(
        ctpClient,
        paymentKey,
        commercetoolsProjectKey,
        adyenMerchantAccount
      )
      expect(paymentBefore.transactions).to.have.lengthOf(1)
      expect(paymentBefore.transactions[0].type).to.equal('Authorization')
      expect(paymentBefore.transactions[0].state).to.equal('Pending')
      expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

      const notificationPayload = createNotificationPayload(
        commercetoolsProjectKey,
        adyenMerchantAccount,
        paymentKey,
        'UNKNOWN_EVENT_CODE'
      )

      // Simulating a notification from Adyen
      const response = await fetch(notificationURL, {
        method: 'post',
        body: JSON.stringify(notificationPayload),
        headers: { 'Content-Type': 'application/json' },
      })
      const { status } = response
      const responseBody = await response.json()

      expect(responseBody).to.deep.equal({ notificationResponse: '[accepted]' })
      expect(status).to.equal(200)

      const { body: paymentAfter } = await ctpClient.fetchByKey(
        ctpClient.builder.payments,
        paymentKey
      )
      expect(paymentAfter.transactions).to.have.lengthOf(1)
      expect(paymentAfter.transactions[0].type).to.equal('Authorization')
      expect(paymentAfter.transactions[0].state).to.equal('Pending')
      expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
      if (config.getModuleConfig().removeSensitiveData) {
        delete notificationPayload.notificationItems[0].NotificationRequestItem
          .additionalData
      }
      expect(
        paymentAfter.interfaceInteractions[0].fields.notification
      ).to.equal(JSON.stringify(notificationPayload.notificationItems[0]))
    }
  )

  it('should response with success when payment does not exist on the platform', async () => {
    const paymentKey = `notificationPayment-${new Date().getTime()}`
    const { body: paymentBefore } = await ensurePayment(
      ctpClient,
      paymentKey,
      commercetoolsProjectKey,
      adyenMerchantAccount
    )
    expect(paymentBefore.transactions).to.have.lengthOf(1)
    expect(paymentBefore.transactions[0].type).to.equal('Authorization')
    expect(paymentBefore.transactions[0].state).to.equal('Pending')
    expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

    const notificationPayload = createNotificationPayload(
      commercetoolsProjectKey,
      adyenMerchantAccount,
      paymentKey,
      'NOT_EXISTING_PAYMENT'
    )

    // Simulating a notification from Adyen
    const response = await fetch(notificationURL, {
      method: 'post',
      body: JSON.stringify(notificationPayload),
      headers: { 'Content-Type': 'application/json' },
    })
    const { status } = response
    const responseBody = await response.json()

    expect(responseBody).to.deep.equal({ notificationResponse: '[accepted]' })
    expect(status).to.equal(200)

    const { body: paymentAfter } = await ctpClient.fetchByKey(
      ctpClient.builder.payments,
      paymentKey
    )
    expect(paymentAfter.transactions).to.have.lengthOf(1)
    expect(paymentAfter.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter.transactions[0].state).to.equal('Pending')
    expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
  })

  it(
    'should update the pending Refund transaction state to success state ' +
      'when receives a successful REFUND notification with refund action',
    async () => {
      const paymentKey = `notificationPayment-${new Date().getTime()}`
      const { body: paymentBefore } = await ensurePayment(
        ctpClient,
        paymentKey,
        commercetoolsProjectKey,
        adyenMerchantAccount
      )
      expect(paymentBefore.transactions).to.have.lengthOf(1)
      expect(paymentBefore.transactions[0].type).to.equal('Authorization')
      expect(paymentBefore.transactions[0].state).to.equal('Pending')
      expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

      const refundInteractionId = _generateRandomNumber()
      const actions = [
        {
          action: 'changeTransactionState',
          state: 'Success',
          transactionId: paymentBefore.transactions[0].id,
        },
        {
          action: 'addTransaction',
          transaction: {
            type: 'Refund',
            amount: {
              currencyCode: paymentBefore.transactions[0].amount.currencyCode,
              centAmount: paymentBefore.transactions[0].amount.centAmount,
            },
            state: 'Pending',
            interactionId: refundInteractionId,
          },
        },
      ]

      const { body: updatedPayment } = await ctpClient.update(
        ctpClient.builder.payments,
        paymentBefore.id,
        paymentBefore.version,
        actions
      )

      expect(updatedPayment.transactions).to.have.lengthOf(2)
      expect(updatedPayment.transactions[0].type).to.equal('Authorization')
      expect(updatedPayment.transactions[0].state).to.equal('Success')
      expect(updatedPayment.transactions[1].type).to.equal('Refund')
      expect(updatedPayment.transactions[1].state).to.equal('Pending')

      const notificationPayload = createNotificationPayload(
        commercetoolsProjectKey,
        adyenMerchantAccount,
        paymentKey,
        'REFUND',
        refundInteractionId
      )

      // Simulating a notification from Adyen
      const response = await fetch(notificationURL, {
        method: 'post',
        body: JSON.stringify(notificationPayload),
        headers: { 'Content-Type': 'application/json' },
      })
      const { status } = response
      const responseBody = await response.json()

      expect(responseBody).to.deep.equal({ notificationResponse: '[accepted]' })
      expect(status).to.equal(200)

      const { body: paymentAfter } = await ctpClient.fetchByKey(
        ctpClient.builder.payments,
        paymentKey
      )
      expect(paymentAfter.transactions).to.have.lengthOf(2)
      expect(paymentAfter.transactions[0].type).to.equal('Authorization')
      expect(paymentAfter.transactions[0].state).to.equal('Success')
      expect(paymentAfter.transactions[1].type).to.equal('Refund')
      expect(paymentAfter.transactions[1].state).to.equal('Success')

      expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
      if (config.getModuleConfig().removeSensitiveData) {
        delete notificationPayload.notificationItems[0].NotificationRequestItem
          .additionalData
      }
      expect(
        paymentAfter.interfaceInteractions[0].fields.notification
      ).to.equal(JSON.stringify(notificationPayload.notificationItems[0]))
    }
  )

  it(
    'should update multiple pending Refund transaction states to corresponding states ' +
      'when receives multiple REFUND notifications',
    async () => {
      const paymentKey = `notificationPayment-${new Date().getTime()}`
      const { body: paymentBefore } = await ensurePayment(
        ctpClient,
        paymentKey,
        commercetoolsProjectKey,
        adyenMerchantAccount
      )
      const refundInteractionId1 = _generateRandomNumber()
      const refundInteractionId2 = _generateRandomNumber()
      const refundInteractionId3 = _generateRandomNumber()
      const actions = [
        {
          action: 'addTransaction',
          transaction: {
            type: 'Refund',
            amount: {
              currencyCode: paymentBefore.transactions[0].amount.currencyCode,
              centAmount: 50,
            },
            state: 'Pending',
            interactionId: refundInteractionId1,
          },
        },
        {
          action: 'addTransaction',
          transaction: {
            type: 'Refund',
            amount: {
              currencyCode: paymentBefore.transactions[0].amount.currencyCode,
              centAmount: 60,
            },
            state: 'Pending',
            interactionId: refundInteractionId2,
          },
        },
        {
          action: 'addTransaction',
          transaction: {
            type: 'Refund',
            amount: {
              currencyCode: paymentBefore.transactions[0].amount.currencyCode,
              centAmount: 70,
            },
            state: 'Pending',
            interactionId: refundInteractionId3,
          },
        },
      ]
      await ctpClient.update(
        ctpClient.builder.payments,
        paymentBefore.id,
        paymentBefore.version,
        actions
      )

      const notificationPayload1 = createNotificationPayload(
        commercetoolsProjectKey,
        adyenMerchantAccount,
        paymentKey,
        'REFUND',
        refundInteractionId1
      )

      const notificationPayload2 = createNotificationPayload(
        commercetoolsProjectKey,
        adyenMerchantAccount,
        paymentKey,
        'REFUND',
        refundInteractionId2
      )

      const notificationPayload3 = createNotificationPayload(
        commercetoolsProjectKey,
        adyenMerchantAccount,
        paymentKey,
        'REFUND',
        refundInteractionId3,
        'false'
      )

      // Simulating notifications from Adyen
      const responses = await Promise.all([
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
        fetch(notificationURL, {
          method: 'post',
          body: JSON.stringify(notificationPayload3),
          headers: { 'Content-Type': 'application/json' },
        }),
      ])

      for (const response of responses) {
        const { status } = response
        const responseBody = await response.json()

        expect(responseBody).to.deep.equal({
          notificationResponse: '[accepted]',
        })
        expect(status).to.equal(200)
      }

      const { body: paymentAfter } = await ctpClient.fetchByKey(
        ctpClient.builder.payments,
        paymentKey
      )
      expect(paymentAfter.transactions).to.have.lengthOf(4)
      expect(paymentAfter.transactions[1].type).to.equal('Refund')
      expect(paymentAfter.transactions[1].state).to.equal('Success')
      expect(paymentAfter.transactions[2].type).to.equal('Refund')
      expect(paymentAfter.transactions[2].state).to.equal('Success')
      expect(paymentAfter.transactions[3].type).to.equal('Refund')
      expect(paymentAfter.transactions[3].state).to.equal('Failure')
    }
  )

  it(
    'should update the pending CancelAuthorization transaction state to success state ' +
      'when receives a successful CANCEL notification with cancel action',
    async () => {
      const paymentKey = `notificationPayment-${new Date().getTime()}`
      const { body: paymentBefore } = await ensurePayment(
        ctpClient,
        paymentKey,
        commercetoolsProjectKey,
        adyenMerchantAccount
      )
      expect(paymentBefore.transactions).to.have.lengthOf(1)
      expect(paymentBefore.transactions[0].type).to.equal('Authorization')
      expect(paymentBefore.transactions[0].state).to.equal('Pending')
      expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

      const cancellationInteractionId = _generateRandomNumber()
      const actions = [
        {
          action: 'addTransaction',
          transaction: {
            type: 'CancelAuthorization',
            amount: {
              currencyCode: paymentBefore.transactions[0].amount.currencyCode,
              centAmount: paymentBefore.transactions[0].amount.centAmount,
            },
            state: 'Pending',
            interactionId: cancellationInteractionId,
          },
        },
      ]

      const { body: updatedPayment } = await ctpClient.update(
        ctpClient.builder.payments,
        paymentBefore.id,
        paymentBefore.version,
        actions
      )

      expect(updatedPayment.transactions).to.have.lengthOf(2)
      expect(updatedPayment.transactions[0].type).to.equal('Authorization')
      expect(updatedPayment.transactions[0].state).to.equal('Pending')
      expect(updatedPayment.transactions[1].type).to.equal(
        'CancelAuthorization'
      )
      expect(updatedPayment.transactions[1].state).to.equal('Pending')

      const notificationPayload = createNotificationPayload(
        commercetoolsProjectKey,
        adyenMerchantAccount,
        paymentKey,
        'CANCEL_OR_REFUND',
        cancellationInteractionId
      )

      // Simulating a notification from Adyen
      const response = await fetch(notificationURL, {
        method: 'post',
        body: JSON.stringify(notificationPayload),
        headers: { 'Content-Type': 'application/json' },
      })
      const { status } = response
      const responseBody = await response.json()

      expect(responseBody).to.deep.equal({ notificationResponse: '[accepted]' })
      expect(status).to.equal(200)

      const { body: paymentAfter } = await ctpClient.fetchByKey(
        ctpClient.builder.payments,
        paymentKey
      )
      expect(paymentAfter.transactions).to.have.lengthOf(2)
      expect(paymentAfter.transactions[0].type).to.equal('Authorization')
      expect(paymentAfter.transactions[0].state).to.equal('Pending')
      expect(paymentAfter.transactions[1].type).to.equal('CancelAuthorization')
      expect(paymentAfter.transactions[1].state).to.equal('Success')

      expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
      if (config.getModuleConfig().removeSensitiveData) {
        delete notificationPayload.notificationItems[0].NotificationRequestItem
          .additionalData
      }
      expect(
        paymentAfter.interfaceInteractions[0].fields.notification
      ).to.equal(JSON.stringify(notificationPayload.notificationItems[0]))
    }
  )

  it('should not update payment when the notification is unauthorised', async () => {
    const paymentKey = `notificationPayment-${new Date().getTime()}`
    const { body: paymentBefore } = await ensurePayment(
      ctpClient,
      paymentKey,
      commercetoolsProjectKey,
      adyenMerchantAccount
    )
    expect(paymentBefore.transactions).to.have.lengthOf(1)
    expect(paymentBefore.transactions[0].type).to.equal('Authorization')
    expect(paymentBefore.transactions[0].state).to.equal('Pending')
    expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

    // enable hmac verification
    overrideAdyenConfig({
      enableHmacSignature: true,
      secretHmacKey:
        '44782DEF547AAA06C910C43932B1EB0C71FC68D9D0C057550C48EC2ACF6BA056',
    })

    const notificationPayload = createNotificationPayload(
      commercetoolsProjectKey,
      adyenMerchantAccount,
      paymentKey
    )

    // Simulating a modification by a middle man during transmission
    notificationPayload.notificationItems[0].NotificationRequestItem.amount.value = 0

    // Simulating a notification from Adyen
    const response = await fetch(notificationURL, {
      method: 'post',
      body: JSON.stringify(notificationPayload),
      headers: { 'Content-Type': 'application/json' },
    })
    const { status } = response
    const responseBody = await response.json()

    expect(responseBody).to.deep.equal({ notificationResponse: '[accepted]' })
    expect(status).to.equal(200)

    const { body: paymentAfter } = await ctpClient.fetchByKey(
      ctpClient.builder.payments,
      paymentKey
    )
    expect(paymentAfter.transactions).to.have.lengthOf(1)
    expect(paymentAfter.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter.transactions[0].state).to.equal('Pending')

    // make sure that the notification is not polluting interactions
    expect(paymentAfter.interfaceInteractions).to.have.lengthOf(0)
  })

  it('should use URL path as a fallback when metadata.ctProjectKey is missing', async () => {
    const paymentKey = `notificationPayment-${new Date().getTime()}`
    const { body: paymentBefore } = await ensurePayment(
      ctpClient,
      paymentKey,
      commercetoolsProjectKey,
      adyenMerchantAccount
    )
    expect(paymentBefore.transactions).to.have.lengthOf(1)
    expect(paymentBefore.transactions[0].type).to.equal('Authorization')
    expect(paymentBefore.transactions[0].state).to.equal('Pending')
    expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

    const notificationPayload = createNotificationPayload(
      null,
      adyenMerchantAccount,
      paymentKey
    )

    // Simulating a notification from Adyen
    const response = await fetch(
      `${notificationURL}/notifications/${commercetoolsProjectKey}`,
      {
        method: 'post',
        body: JSON.stringify(notificationPayload),
        headers: { 'Content-Type': 'application/json' },
      }
    )

    const { status } = response
    const responseBody = await response.json()

    expect(responseBody).to.deep.equal({ notificationResponse: '[accepted]' })
    expect(status).to.equal(200)

    const { body: paymentAfter } = await ctpClient.fetchByKey(
      ctpClient.builder.payments,
      paymentKey
    )
    expect(paymentAfter.transactions).to.have.lengthOf(1)
    expect(paymentAfter.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter.transactions[0].state).to.equal('Success')
    expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
  })

  function _generateRandomNumber() {
    return (
      new Date().getTime() + Math.floor(Math.random() * 100 + 1)
    ).toString()
  }
})
