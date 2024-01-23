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
      config.getCtpConfig(commercetoolsProjectKey),
    )
    notificationURL = getNotificationURL()
  })

  it(
    'should update the pending authorization transaction state to success state ' +
      'when receives a successful AUTHORIZATION notification',
    async () => {
      const merchantReference = `notificationPayment-${new Date().getTime()}`
      // pspReference cannot be static otherwise wrong payment created in the past would be obtained
      const pspReference = `pspReference-${new Date().getTime()}`
      const { body: paymentBefore } = await ensurePayment(
        ctpClient,
        merchantReference,
        pspReference,
        commercetoolsProjectKey,
        adyenMerchantAccount,
      )
      expect(paymentBefore.transactions).to.have.lengthOf(1)
      expect(paymentBefore.transactions[0].type).to.equal('Authorization')
      expect(paymentBefore.transactions[0].state).to.equal('Pending')
      expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

      const notificationPayload = createNotificationPayload(
        commercetoolsProjectKey,
        adyenMerchantAccount,
        merchantReference,
        pspReference,
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
        pspReference, // pspReference is the key of authorized payment
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
        paymentAfter.interfaceInteractions[0].fields.notification,
      ).to.equal(JSON.stringify(notificationPayload.notificationItems[0]))
    },
  )

  it('should add a charge transaction when receives a successful manual CAPTURE notification', async () => {
    const merchantReference = `notificationPayment-${new Date().getTime()}`
    // pspReference cannot be static otherwise payment created in the past would be wrongly obtained
    const pspReference = `pspReference-${new Date().getTime()}`
    const chargeInteractionId = _generateRandomNumber()
    const { body: paymentBefore } = await ensurePayment(
      ctpClient,
      merchantReference,
      pspReference,
      commercetoolsProjectKey,
      adyenMerchantAccount,
    )
    expect(paymentBefore.transactions).to.have.lengthOf(1)
    expect(paymentBefore.transactions[0].type).to.equal('Authorization')
    expect(paymentBefore.transactions[0].state).to.equal('Pending')
    expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

    // update payment transaction and set pspReference as key for authorized payment
    const actions = [
      {
        action: 'changeTransactionState',
        state: 'Success',
        transactionId: paymentBefore.transactions[0].id,
      },
      {
        action: 'setKey',
        key: pspReference,
      },
    ]

    const { body: updatedPayment } = await ctpClient.update(
      ctpClient.builder.payments,
      paymentBefore.id,
      paymentBefore.version,
      actions,
    )

    expect(updatedPayment.transactions).to.have.lengthOf(1)
    expect(updatedPayment.transactions[0].type).to.equal('Authorization')
    expect(updatedPayment.transactions[0].state).to.equal('Success')

    const notificationPayload = createNotificationPayload(
      commercetoolsProjectKey,
      adyenMerchantAccount,
      merchantReference,
      chargeInteractionId,
      'CAPTURE',
      'true',
      pspReference,
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
      pspReference, // pspReference is the key of authorized payment
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
      JSON.stringify(notificationPayload.notificationItems[0]),
    )
  })

  it(
    'should not update transaction when the notification event ' +
      'is not mapped to any CTP payment state',
    async () => {
      const merchantReference = `notificationPayment-${new Date().getTime()}`
      // pspReference cannot be static otherwise payment created in the past would be wrongly obtained
      const pspReference = `pspReference-${new Date().getTime()}`
      const { body: paymentBefore } = await ensurePayment(
        ctpClient,
        merchantReference,
        pspReference,
        commercetoolsProjectKey,
        adyenMerchantAccount,
      )
      expect(paymentBefore.transactions).to.have.lengthOf(1)
      expect(paymentBefore.transactions[0].type).to.equal('Authorization')
      expect(paymentBefore.transactions[0].state).to.equal('Pending')
      expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

      const notificationPayload = createNotificationPayload(
        commercetoolsProjectKey,
        adyenMerchantAccount,
        merchantReference,
        pspReference,
        'UNKNOWN_EVENT_CODE',
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
        merchantReference, // merchantReference is the key of unauthorized payment
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
        paymentAfter.interfaceInteractions[0].fields.notification,
      ).to.equal(JSON.stringify(notificationPayload.notificationItems[0]))
    },
  )

  it('should response with success when payment does not exist on the platform', async () => {
    const merchantReference = `notificationPayment-${new Date().getTime()}`
    // pspReference cannot be static otherwise payment created in the past would be wrongly obtained
    const pspReference = `pspReference-${new Date().getTime()}`
    const { body: paymentBefore } = await ensurePayment(
      ctpClient,
      merchantReference,
      pspReference,
      commercetoolsProjectKey,
      adyenMerchantAccount,
    )
    expect(paymentBefore.transactions).to.have.lengthOf(1)
    expect(paymentBefore.transactions[0].type).to.equal('Authorization')
    expect(paymentBefore.transactions[0].state).to.equal('Pending')
    expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

    const notificationPayload = createNotificationPayload(
      commercetoolsProjectKey,
      adyenMerchantAccount,
      merchantReference,
      pspReference,
      'NOT_EXISTING_PAYMENT',
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
      merchantReference, // merchantReference is the key of unauthorized payment
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
      const merchantReference = `notificationPayment-${new Date().getTime()}`
      // pspReference cannot be static otherwise payment created in the past would be wrongly obtained
      const pspReference = `pspReference-${new Date().getTime()}`

      const { body: paymentBefore } = await ensurePayment(
        ctpClient,
        merchantReference,
        pspReference,
        commercetoolsProjectKey,
        adyenMerchantAccount,
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
        // Change the payment key to pspReference for authorized payment
        {
          action: 'setKey',
          key: pspReference,
        },
      ]

      const { body: updatedPayment } = await ctpClient.update(
        ctpClient.builder.payments,
        paymentBefore.id,
        paymentBefore.version,
        actions,
      )

      expect(updatedPayment.transactions).to.have.lengthOf(2)
      expect(updatedPayment.transactions[0].type).to.equal('Authorization')
      expect(updatedPayment.transactions[0].state).to.equal('Success')
      expect(updatedPayment.transactions[1].type).to.equal('Refund')
      expect(updatedPayment.transactions[1].state).to.equal('Pending')

      const notificationPayload = createNotificationPayload(
        commercetoolsProjectKey,
        adyenMerchantAccount,
        merchantReference,
        refundInteractionId,
        'REFUND',
        'true',
        pspReference,
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
        pspReference, // pspReference is the key of authorized payment
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
        paymentAfter.interfaceInteractions[0].fields.notification,
      ).to.equal(JSON.stringify(notificationPayload.notificationItems[0]))
    },
  )

  it(
    'should update multiple pending Refund transaction states to corresponding states ' +
      'when receives multiple REFUND notifications',
    async () => {
      const merchantReference = `notificationPayment-${new Date().getTime()}`
      // pspReference cannot be static otherwise payment created in the past would be wrongly obtained
      const pspReference = `pspReference-${new Date().getTime()}`
      const { body: paymentBefore } = await ensurePayment(
        ctpClient,
        merchantReference,
        pspReference,
        commercetoolsProjectKey,
        adyenMerchantAccount,
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
        // Change the payment key to pspReference for authorized payment
        {
          action: 'setKey',
          key: pspReference,
        },
      ]
      await ctpClient.update(
        ctpClient.builder.payments,
        paymentBefore.id,
        paymentBefore.version,
        actions,
      )

      const notificationPayload1 = createNotificationPayload(
        commercetoolsProjectKey,
        adyenMerchantAccount,
        merchantReference,
        refundInteractionId1,
        'REFUND',
        'true',
        pspReference,
      )

      const notificationPayload2 = createNotificationPayload(
        commercetoolsProjectKey,
        adyenMerchantAccount,
        merchantReference,
        refundInteractionId2,
        'REFUND',
        'true',
        pspReference,
      )

      const notificationPayload3 = createNotificationPayload(
        commercetoolsProjectKey,
        adyenMerchantAccount,
        merchantReference,
        refundInteractionId3,
        'REFUND',
        'false',
        pspReference,
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
        pspReference, // pspReference is the key of authorized payment
      )
      expect(paymentAfter.transactions).to.have.lengthOf(4)
      expect(paymentAfter.transactions[1].type).to.equal('Refund')
      expect(paymentAfter.transactions[1].state).to.equal('Success')
      expect(paymentAfter.transactions[2].type).to.equal('Refund')
      expect(paymentAfter.transactions[2].state).to.equal('Success')
      expect(paymentAfter.transactions[3].type).to.equal('Refund')
      expect(paymentAfter.transactions[3].state).to.equal('Failure')
    },
  )

  it(
    'should update the pending CancelAuthorization transaction state to success state ' +
      'when receives a successful CANCEL notification with cancel action',
    async () => {
      const merchantReference = `notificationPayment-${new Date().getTime()}`
      // pspReference cannot be static otherwise payment created in the past would be wrongly obtained
      const pspReference = `pspReference-${new Date().getTime()}`
      const { body: paymentBefore } = await ensurePayment(
        ctpClient,
        merchantReference,
        pspReference,
        commercetoolsProjectKey,
        adyenMerchantAccount,
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
        {
          action: 'changeTransactionState',
          state: 'Success',
          transactionId: paymentBefore.transactions[0].id,
        },

        // Change the payment key to pspReference for authorized payment
        {
          action: 'setKey',
          key: pspReference,
        },
      ]

      const { body: updatedPayment } = await ctpClient.update(
        ctpClient.builder.payments,
        paymentBefore.id,
        paymentBefore.version,
        actions,
      )

      expect(updatedPayment.transactions).to.have.lengthOf(2)
      expect(updatedPayment.transactions[0].type).to.equal('Authorization')
      expect(updatedPayment.transactions[0].state).to.equal('Success')
      expect(updatedPayment.transactions[1].type).to.equal(
        'CancelAuthorization',
      )
      expect(updatedPayment.transactions[1].state).to.equal('Pending')

      const notificationPayload = createNotificationPayload(
        commercetoolsProjectKey,
        adyenMerchantAccount,
        merchantReference,
        cancellationInteractionId,
        'CANCEL_OR_REFUND',
        'true',
        pspReference,
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
        pspReference, // pspReference is the key of authorized payment
      )
      expect(paymentAfter.transactions).to.have.lengthOf(2)
      expect(paymentAfter.transactions[0].type).to.equal('Authorization')
      expect(paymentAfter.transactions[0].state).to.equal('Success')
      expect(paymentAfter.transactions[1].type).to.equal('CancelAuthorization')
      expect(paymentAfter.transactions[1].state).to.equal('Success')

      expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
      if (config.getModuleConfig().removeSensitiveData) {
        delete notificationPayload.notificationItems[0].NotificationRequestItem
          .additionalData
      }
      expect(
        paymentAfter.interfaceInteractions[0].fields.notification,
      ).to.equal(JSON.stringify(notificationPayload.notificationItems[0]))
    },
  )

  it('should not update payment when the notification is unauthorised', async () => {
    const merchantReference = `notificationPayment-${new Date().getTime()}`
    // pspReference cannot be static otherwise payment created in the past would be wrongly obtained
    const pspReference = `pspReference-${new Date().getTime()}`
    const { body: paymentBefore } = await ensurePayment(
      ctpClient,
      merchantReference,
      pspReference,
      commercetoolsProjectKey,
      adyenMerchantAccount,
    )
    expect(paymentBefore.transactions).to.have.lengthOf(1)
    expect(paymentBefore.transactions[0].type).to.equal('Authorization')
    expect(paymentBefore.transactions[0].state).to.equal('Pending')
    expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

    // enable hmac verification
    overrideAdyenConfig({
      enableHmacSignature: true,
      secretHmacKey:
        '8DEBC5AEA59D98DD5CC0F0CE7B7D5676B293C341DC93B4C94DF5DB9E123314A5',
    })

    const notificationPayload = createNotificationPayload(
      commercetoolsProjectKey,
      adyenMerchantAccount,
      merchantReference,
      pspReference,
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
      merchantReference, // merchantReference is the key of unauthorized payment
    )
    expect(paymentAfter.transactions).to.have.lengthOf(1)
    expect(paymentAfter.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter.transactions[0].state).to.equal('Pending')

    // make sure that the notification is not polluting interactions
    expect(paymentAfter.interfaceInteractions).to.have.lengthOf(0)
  })

  it('should use URL path as a fallback when metadata.ctProjectKey is missing', async () => {
    const merchantReference = `notificationPayment-${new Date().getTime()}`
    // pspReference cannot be static otherwise payment created in the past would be wrongly obtained
    const pspReference = `pspReference-${new Date().getTime()}`
    const { body: paymentBefore } = await ensurePayment(
      ctpClient,
      merchantReference,
      pspReference,
      commercetoolsProjectKey,
      adyenMerchantAccount,
    )
    expect(paymentBefore.transactions).to.have.lengthOf(1)
    expect(paymentBefore.transactions[0].type).to.equal('Authorization')
    expect(paymentBefore.transactions[0].state).to.equal('Pending')
    expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

    const notificationPayload = createNotificationPayload(
      null,
      adyenMerchantAccount,
      merchantReference,
      pspReference,
    )

    // Simulating a notification from Adyen
    const response = await fetch(
      `${notificationURL}/notifications/${commercetoolsProjectKey}`,
      {
        method: 'post',
        body: JSON.stringify(notificationPayload),
        headers: { 'Content-Type': 'application/json' },
      },
    )

    const { status } = response
    const responseBody = await response.json()

    expect(responseBody).to.deep.equal({ notificationResponse: '[accepted]' })
    expect(status).to.equal(200)

    const { body: paymentAfter } = await ctpClient.fetchByKey(
      ctpClient.builder.payments,
      pspReference, // pspReference is the key of authorized payment
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
