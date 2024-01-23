import nock from 'nock'
import lodash from 'lodash'
import { expect } from 'chai'
import config from '../../src/config/config.js'
import manualCaptureHandler from '../../src/paymentHandler/manual-capture.handler.js'
import constants from '../../src/config/constants.js'
import { overrideGenerateIdempotencyKeyConfig } from '../test-utils.js'

const { cloneDeep } = lodash
const { CTP_INTERACTION_TYPE_MANUAL_CAPTURE } = constants

describe('manual-capture.handler::execute::', () => {
  /* eslint-disable*/
  const authorisedPayment = {
    id: 'paymentId',
    transactions: [
      {
        id: 'transaction1',
        type: 'Authorization',
        interactionId: '8313547924770610',
        state: 'Success',
      },
    ],
    interfaceInteractions: [
      {
        type: {
          typeId: 'type',
        },
        fields: {
          type: constants.CTP_INTERACTION_TYPE_CREATE_SESSION,
          request:
            '{"amount":{"currency":"EUR","value":500},"reference":"YOUR_UNIQUE_REFERENCE","returnUrl":"https://your-company.com/","merchantAccount":"YOUR_MERCHANT_ACCOUNT"}',
          response:
            '{"amount": {"currency": "EUR","value": 1000},"countryCode": "NL","expiresAt": "2021-08-24T13:35:16+02:00","id": "CSD9CAC34EBAE225DD","merchantAccount": "YOUR_MERCHANT_ACCOUNT","reference": "YOUR_UNIQUE_REFERENCE","returnUrl": "https://your-company.com/","sessionData": "Ab02b4c..."}',
          createdAt: '2020-06-10T12:37:00.010Z',
        },
      },
    ],
    custom: {
      fields: {},
    },
  }
  /* eslint-enable */

  const chargeInitialTransaction = {
    id: 'chargeInitialTransactionId',
    type: 'Charge',
    amount: {
      currencyCode: 'EUR',
      centAmount: 1000,
    },
    custom: {
      type: {
        typeId: 'type',
        id: '9f7d21aa-264e-43ea-a540-acb9c28aa6be',
      },
      fields: {
        reference: '123456789',
      },
    },
    state: 'Initial',
  }

  const manualCaptureResponse = {
    pspReference: '8825408195409505',
    response: '[capture-received]',
  }

  let scope
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]

  beforeEach(() => {
    const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
    scope = nock(`${adyenConfig.apiBaseUrl}/payments/8313547924770610/`)
  })

  it(
    'given a payment ' +
      'when "/capture" request to Adyen is received successfully ' +
      'then it should return actions "addInterfaceInteraction", ' +
      '"changeTransactionState" and "changeTransactionInteractionId"',
    async () => {
      scope.post('/captures').reply(200, manualCaptureResponse)

      const paymentObject = cloneDeep(authorisedPayment)
      paymentObject.transactions.push(chargeInitialTransaction)
      paymentObject.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const { actions } = await manualCaptureHandler.execute(paymentObject)

      expect(actions).to.have.lengthOf(3)

      const addInterfaceInteraction = actions.find(
        (a) => a.action === 'addInterfaceInteraction',
      )
      expect(addInterfaceInteraction.fields.type).to.equal(
        CTP_INTERACTION_TYPE_MANUAL_CAPTURE,
      )
      expect(addInterfaceInteraction.fields.request).to.be.a('string')
      expect(addInterfaceInteraction.fields.response).to.equal(
        JSON.stringify(manualCaptureResponse),
      )
      expect(addInterfaceInteraction.fields.createdAt).to.be.a('string')

      const changeTransactionState = actions.find(
        (a) => a.action === 'changeTransactionState',
      )
      expect(changeTransactionState).to.be.deep.equal({
        transactionId: 'chargeInitialTransactionId',
        action: 'changeTransactionState',
        state: 'Pending',
      })

      const changeTransactionInteractionId = actions.find(
        (a) => a.action === 'changeTransactionInteractionId',
      )
      expect(changeTransactionInteractionId).to.be.deep.equal({
        transactionId: 'chargeInitialTransactionId',
        action: 'changeTransactionInteractionId',
        interactionId: '8825408195409505',
      })
    },
  )

  it(
    'given a payment ' +
      'when "/capture" request to Adyen is failed ' +
      'then it should return "addInterfaceInteraction" action only',
    async () => {
      const validationError = {
        status: 422,
        errorCode: '167',
        message: 'Original pspReference required for this operation',
        errorType: 'validation',
      }
      scope.post('/captures').reply(422, validationError)

      const paymentObject = cloneDeep(authorisedPayment)
      paymentObject.transactions.push(chargeInitialTransaction)
      paymentObject.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const { actions } = await manualCaptureHandler.execute(paymentObject)
      expect(actions).to.have.lengthOf(1)

      const addInterfaceInteraction = actions.find(
        (a) => a.action === 'addInterfaceInteraction',
      )
      expect(addInterfaceInteraction.fields.type).to.equal(
        CTP_INTERACTION_TYPE_MANUAL_CAPTURE,
      )
      expect(addInterfaceInteraction.fields.request).to.be.a('string')
      expect(addInterfaceInteraction.fields.response).to.equal(
        JSON.stringify(validationError),
      )
      expect(addInterfaceInteraction.fields.createdAt).to.be.a('string')

      const addTransaction = actions.find((a) => a.action === 'addTransaction')
      expect(addTransaction).to.equal(undefined)
    },
  )

  it(
    'when manual capture payment request contains reference, then it should send this reference to ' +
      'Adyen',
    async () => {
      scope.post('/captures').reply(200, manualCaptureResponse)

      const paymentObject = cloneDeep(authorisedPayment)
      paymentObject.transactions.push(chargeInitialTransaction)
      paymentObject.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const { actions } = await manualCaptureHandler.execute(paymentObject)

      const adyenRequest = actions.find(
        (action) => action.action === 'addInterfaceInteraction',
      ).fields.request
      const adyenRequestJson = JSON.parse(adyenRequest)
      const requestBody = JSON.parse(adyenRequestJson.body)

      expect(requestBody.reference).to.equal(
        chargeInitialTransaction.custom.fields.reference,
      )
    },
  )

  it(
    'given a payment ' +
      'when generateIdempotencyKey is true ' +
      'then it should get the idempotency key from transaction id',
    async () => {
      overrideGenerateIdempotencyKeyConfig(true)

      scope.post('/captures').reply(200, manualCaptureResponse)

      const paymentObject = cloneDeep(authorisedPayment)
      paymentObject.transactions.push(chargeInitialTransaction)
      paymentObject.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const { actions } = await manualCaptureHandler.execute(paymentObject)

      const addInterfaceInteraction = actions.find(
        (a) => a.action === 'addInterfaceInteraction',
      )
      const requestJson = JSON.parse(addInterfaceInteraction.fields.request)
      expect(requestJson.headers['Idempotency-Key']).to.equal(
        chargeInitialTransaction.id,
      )
    },
  )
})
