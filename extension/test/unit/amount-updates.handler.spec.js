import nock from 'nock'
import lodash from 'lodash'
import { expect } from 'chai'
import config from '../../src/config/config.js'
import amountUpdatesHandler from '../../src/paymentHandler/amount-updates.handler.js'
import constants from '../../src/config/constants.js'

const { cloneDeep } = lodash

describe('amount-updates.handler::execute::', () => {
  /* eslint-disable*/

  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const ctpProjectKey = config.getAllCtpProjectKeys()[0]

  const getSessionRequest = {
    countryCode: 'DE',
    reference: 'UNIQUE_PAYMENT_REFERENCE',
    amount: {
      currency: 'EUR',
      value: 1000,
    },
  }
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
      type: {
        typeId: 'type',
        key: constants.CTP_PAYMENT_CUSTOM_TYPE_KEY,
      },
      fields: {
        commercetoolsProjectKey: ctpProjectKey,
        createSessionRequest: JSON.stringify(getSessionRequest),
        adyenMerchantAccount,
      },
    },
  }

  const paymentPspReference = 'GZ67RFTCHV5X8N82'
  const amountUpdatesRequestDraft = {
    paymentPspReference,
    amount: { currency: 'EUR', value: 1010 },
    reason: 'delayedCharge',
    reference: '1675440070897',
  }

  /* eslint-enable */

  const amountUpdatesResponse = {
    merchantAccount: adyenMerchantAccount,
    paymentPspReference,
    pspReference: 'CS7NLC4WD3RZNN82',
    reference: '1675440070897',
    status: 'received',
    amount: { currency: 'EUR', value: 1010 },
  }

  let scope

  beforeEach(() => {
    const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
    scope = nock(`${adyenConfig.apiBaseUrl}/payments/${paymentPspReference}`)
  })

  it(
    'given a payment ' +
      'when "/amountUpdates" request to Adyen is received successfully ' +
      'then it should return actions "addInterfaceInteraction" and "setCustomField"',
    async () => {
      scope.post('/amountUpdates').reply(200, amountUpdatesResponse)

      const paymentObject = cloneDeep(authorisedPayment)

      paymentObject.custom.fields.amountUpdatesRequest = JSON.stringify(
        amountUpdatesRequestDraft,
      )

      const { actions } = await amountUpdatesHandler.execute(paymentObject)

      expect(actions).to.have.lengthOf(2)

      const addInterfaceInteraction = actions.find(
        (a) => a.action === 'addInterfaceInteraction',
      )
      expect(addInterfaceInteraction.fields.type).to.equal(
        constants.CTP_INTERACTION_TYPE_AMOUNT_UPDATES,
      )
      expect(addInterfaceInteraction.fields.request).to.be.a('string')

      expect(addInterfaceInteraction.fields.response).to.equal(
        JSON.stringify(amountUpdatesResponse),
      )
      expect(addInterfaceInteraction.fields.createdAt).to.be.a('string')

      const setCustomField = actions.find((a) => a.action === 'setCustomField')
      expect(setCustomField).to.be.deep.equal({
        name: 'amountUpdatesResponse',
        action: 'setCustomField',
        value: JSON.stringify(amountUpdatesResponse),
      })
    },
  )
})
