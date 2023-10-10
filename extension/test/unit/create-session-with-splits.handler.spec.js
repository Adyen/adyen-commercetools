import nock from 'nock'
import { expect } from 'chai'
import c from '../../src/config/constants.js'
import config from '../../src/config/config.js'
import sessionRequestHandler from '../../src/paymentHandler/sessions-request.handler.js'

const { execute } = sessionRequestHandler

describe('create-session-with-splits::execute', () => {
  let scope

  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const createSessiontWithSplitsRequest = {
    amount: {
      currency: 'EUR',
      value: 512,
    },
    splits: [
      {
        amount: {
          value: 12,
        },
        type: 'BalanceAccount',
        account: 'BA0000X000000X0XXX0X00XXX',
        reference: 'Restore',
      },
      {
        amount: {
          value: 500,
        },
        type: 'Default',
        reference: 'Payment',
      },
    ],
    reference: 'payment-with-planet-fees',
    merchantAccount: adyenMerchantAccount,
    returnUrl: 'https://planet-friendly.merchant/shopperReturn',
  }
  const paymentObject = {
    amountPlanned: {
      currencyCode: 'EUR',
      centAmount: 1000,
    },
    paymentMethodInfo: {
      paymentInterface: c.CTP_ADYEN_INTEGRATION,
    },
    interfaceInteractions: [],
    custom: {
      type: {
        typeId: 'type',
        key: c.CTP_PAYMENT_CUSTOM_TYPE_KEY,
      },
      fields: {
        commercetoolsProjectKey: 'commercetoolsProjectKey',
        createSessionRequest: JSON.stringify(createSessiontWithSplitsRequest),
        adyenMerchantAccount,
      },
    },
  }

  beforeEach(() => {
    const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
    scope = nock(`${adyenConfig.apiBaseUrl}`)
  })

  it(
    'given a payment with splits (restore and payment) ' +
      'when resultCode from Adyen is "Authorized", ' +
      'then it should return actions "addInterfaceInteraction", "setCustomField", "setKey" and "addTransaction"',
    async () => {
      const createSessionSuccessResponse = JSON.stringify({
        amount: {
          currency: 'EUR',
          value: 512,
        },
        merchantReference: 'payment-with-planet-fees',
      })

      scope.post('/sessions').reply(200, createSessionSuccessResponse)

      const response = await execute(paymentObject)

      expect(response.actions).to.have.lengthOf(3)

      const addInterfaceInteraction = response.actions.find(
        (a) => a.action === 'addInterfaceInteraction',
      )
      expect(addInterfaceInteraction.fields.type).to.equal('createSession')
      expect(addInterfaceInteraction.fields.request).to.be.a('string')
      expect(addInterfaceInteraction.fields.response).to.be.a('string')
      expect(addInterfaceInteraction.fields.createdAt).to.be.a('string')

      const request = JSON.parse(addInterfaceInteraction.fields.request)
      const requestBody = JSON.parse(request.body)
      expect(requestBody.reference).to.deep.equal(
        createSessiontWithSplitsRequest.reference,
      )
      expect(requestBody.riskData).to.deep.equal(
        createSessiontWithSplitsRequest.riskData,
      )

      expect(requestBody.browserInfo).to.deep.equal(
        createSessiontWithSplitsRequest.browserInfo,
      )
      expect(requestBody.amount).to.deep.equal(
        createSessiontWithSplitsRequest.amount,
      )
      expect(requestBody.merchantAccount).to.equal(adyenMerchantAccount)

      const setCustomFieldAction = response.actions.find(
        (a) => a.action === 'setCustomField',
      )
      expect(setCustomFieldAction.name).to.equal('createSessionResponse')
      expect(setCustomFieldAction.value).to.be.a('string')
      expect(setCustomFieldAction.value).to.equal(
        addInterfaceInteraction.fields.response,
      )

      const setKeyAction = response.actions.find((a) => a.action === 'setKey')
      expect(setKeyAction.key).to.equal(
        createSessiontWithSplitsRequest.reference,
      )
    },
  )
})
