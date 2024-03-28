import { expect } from 'chai'
import nock from 'nock'
import c from '../../src/config/constants.js'
import config from '../../src/config/config.js'
import utils from "../../src/utils.js";
import mockCtpEnpoints from "./mock-ctp-enpoints.js";
import createSessionSuccessResponse from "./fixtures/adyen-create-session-success-response.js";
import createSessionRequestPaymentHandler from "../../src/paymentHandler/sessions-request.handler.js";

describe('create-session-request::execute::', () => {
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0];
  const commercetoolsProjectKey = config.getAllCtpProjectKeys()[0];
  let ctpCart
  let ctpCartWithCustomer
  let ctpCustomer
  let ctpCartWithNoData
  let scope
  let getSessionRequest
  let paymentObject
  let getSessionRequestWithAdditionalFields
  let paymentObjectWithAdditionalFields

  before(async () => {
    ctpCart = await utils.readAndParseJsonFile(
        'test/unit/fixtures/ctp-cart.json',
    )
    ctpCartWithCustomer = await utils.readAndParseJsonFile(
        'test/unit/fixtures/ctp-cart-with-customer.json',
    )
    ctpCustomer = await utils.readAndParseJsonFile(
        'test/unit/fixtures/ctp-customer.json',
    )
    ctpCartWithNoData = await utils.readAndParseJsonFile(
      'test/unit/fixtures/ctp-cart-no-data.json',
    )
  })

    /* eslint-enable max-len */
  beforeEach(() => {
   const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
   scope = nock(`${adyenConfig.apiBaseUrl}`)

   getSessionRequest = {
      countryCode: 'DE',
      reference: 'UNIQUE_PAYMENT_REFERENCE',
      amount: {
          currency: 'EUR',
          value: 1000,
      },
   }
    paymentObject = {
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
              commercetoolsProjectKey,
              createSessionRequest: JSON.stringify(getSessionRequest),
              adyenMerchantAccount,
          },
      },
   }
   getSessionRequestWithAdditionalFields = {
      countryCode: 'DE',
      reference: 'UNIQUE_PAYMENT_REFERENCE',
      amount: {
          currency: 'EUR',
          value: 1000,
      },
      dateOfBirth: '2000-08-08',
      additionalData : {
          enhancedSchemeData: {
              destinationCountryCode: 'FR',
              destinationPostalCode: '75001'
          }
      },
      shopperName : {
          firstName: 'Test',
          lastName: 'Customer'
      },
   }
   paymentObjectWithAdditionalFields = {
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
              commercetoolsProjectKey,
              createSessionRequest: JSON.stringify(getSessionRequestWithAdditionalFields),
              adyenMerchantAccount,
          },
      },
   }
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it('handlePayment should return the right actions', async () => {
    const adyenGetSessionResponse = {
      amount: {
        currency: 'EUR',
        value: 1000,
      },
      countryCode: 'DE',
      expiresAt: '2022-12-24T13:35:16+02:00',
      id: 'CSD9CAC34EBAE225DD',
      reference: 'UNIQUE_PAYMENT_REFERENCE',
      sessionData: 'Ab02b4c...',
    }

    mockCtpEnpoints._mockCtpCartsEndpoint(ctpCart, commercetoolsProjectKey);
    scope.post('/sessions').query(true).reply(200, adyenGetSessionResponse)

    const result = await createSessionRequestPaymentHandler.execute(paymentObject)

    expect(result.actions.length).to.equal(3)
    expect(result.actions[0].action).to.equal('addInterfaceInteraction')
    expect(result.actions[1].action).to.equal('setCustomField')
    const request = JSON.parse(result.actions[0].fields.request)
    expect(JSON.parse(request.body)).to.be.deep.includes(getSessionRequest)
    expect(result.actions[0].fields.response).to.be.deep.equal(
      JSON.stringify(adyenGetSessionResponse),
    )
    expect(result.actions[0].fields.response).to.be.deep.equal(
      result.actions[1].value,
    )
    expect(result.actions[0].fields.type).to.equal(
      c.CTP_INTERACTION_TYPE_CREATE_SESSION,
    )
    expect(result.actions[1].name).to.equal(
      c.CTP_INTERACTION_TYPE_CREATE_SESSION_RESPONSE,
    )
  })

  it(
    'when adyen request fails ' +
      'then handlePayment should return the right actions with failed responses',
    async () => {
      const errorMsg = 'Unexpected exception'

      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCart, commercetoolsProjectKey);
      scope.post('/sessions').query(true).replyWithError(errorMsg)

      const result = await createSessionRequestPaymentHandler.execute(paymentObject)

      expect(result.actions.length).to.equal(3)
      expect(result.actions[0].action).to.equal('addInterfaceInteraction')
      expect(result.actions[1].action).to.equal('setCustomField')
      const request = JSON.parse(result.actions[0].fields.request)
      expect(JSON.parse(request.body)).to.be.deep.includes(getSessionRequest)
      expect(result.actions[0].fields.response).to.be.includes(errorMsg)
      expect(result.actions[0].fields.type).to.equal(
        c.CTP_INTERACTION_TYPE_CREATE_SESSION,
      )
      expect(result.actions[1].name).to.equal(
        c.CTP_INTERACTION_TYPE_CREATE_SESSION_RESPONSE,
      )
    },
  )

  it(
    'when createSessionRequest contains some additional fields, ' +
    'and cart contains fields like billingAddress, shippingAddress, lineItems, customLineItems, ' +
    'then fields from createSessionRequest should remain unchanged,' +
    'and other fields from cart should be mapped to createSessionRequest',
    async () => {
        mockCtpEnpoints._mockCtpCustomerEndpoint(ctpCustomer, commercetoolsProjectKey)
        mockCtpEnpoints._mockCtpCartsEndpoint(ctpCartWithCustomer, commercetoolsProjectKey)
        scope.post('/sessions').reply(200, createSessionSuccessResponse)

        const response =
            await createSessionRequestPaymentHandler.execute(paymentObjectWithAdditionalFields)

        expect(response.actions).to.have.lengthOf(3)
        const createSessionRequestInteraction = JSON.parse(
            response.actions.find((a) => a.action === 'addInterfaceInteraction')
                .fields.request,
        )
        const createSessionRequestJson = JSON.parse(
            createSessionRequestInteraction.body,
        )

        expect(createSessionRequestJson.countryCode).to.equal(getSessionRequestWithAdditionalFields.countryCode)
        expect(createSessionRequestJson.dateOfBirth).to.equal(getSessionRequestWithAdditionalFields.dateOfBirth)
        expect(createSessionRequestJson.additionalData.enhancedSchemeData.destinationCountryCode).to.equal(
            getSessionRequestWithAdditionalFields.additionalData.enhancedSchemeData.destinationCountryCode
        )
        expect(createSessionRequestJson.additionalData.enhancedSchemeData.destinationPostalCode).to.equal(
            getSessionRequestWithAdditionalFields.additionalData.enhancedSchemeData.destinationPostalCode
        )
        expect(createSessionRequestJson.shopperName.firstName).to.equal(
            getSessionRequestWithAdditionalFields.shopperName.firstName
        )
        expect(createSessionRequestJson.shopperName.lastName).to.equal(
            getSessionRequestWithAdditionalFields.shopperName.lastName
        )

        expect(createSessionRequestJson.billingAddress.street).to.equal(ctpCartWithCustomer.billingAddress.streetName)
        expect(createSessionRequestJson.billingAddress.houseNumberOrName).to.equal(
            ctpCartWithCustomer.billingAddress.streetNumber
        )
        expect(createSessionRequestJson.billingAddress.city).to.equal(ctpCartWithCustomer.billingAddress.city)
        expect(createSessionRequestJson.billingAddress.postalCode).to.equal(
            ctpCartWithCustomer.billingAddress.postalCode
        )
        expect(createSessionRequestJson.billingAddress.country).to.equal(ctpCartWithCustomer.billingAddress.country)
        expect(createSessionRequestJson.shopperEmail).to.equal(ctpCartWithCustomer.customerEmail)

        expect(createSessionRequestJson.accountInfo.accountCreationDate).to.equal(ctpCustomer.createdAt)
        expect(createSessionRequestJson.accountInfo.accountChangeDate).to.equal(ctpCustomer.lastModifiedAt)
        expect(createSessionRequestJson.accountInfo.accountAgeIndicator).to.equal('moreThan60Days')
        expect(createSessionRequestJson.accountInfo.accountChangeIndicator).to.equal('moreThan60Days')
    },
  )

  it(
    'when createSessionRequest doesn\'t contain any additional field, ' +
    'and cart contains fields like billingAddress, shippingAddress, lineItems, customLineItems, ' +
    'then fields from cart should be mapped to createSessionRequest',
    async () => {
        mockCtpEnpoints._mockCtpCustomerEndpoint(ctpCustomer, commercetoolsProjectKey)
        mockCtpEnpoints._mockCtpCartsEndpoint(ctpCartWithCustomer, commercetoolsProjectKey)
        scope.post('/sessions').reply(200, createSessionSuccessResponse)

        const response =
            await createSessionRequestPaymentHandler.execute(paymentObject)

        expect(response.actions).to.have.lengthOf(3)
        const createSessionRequestInteraction = JSON.parse(
            response.actions.find((a) => a.action === 'addInterfaceInteraction')
                .fields.request,
        )
        const createSessionRequestJson = JSON.parse(
            createSessionRequestInteraction.body,
        )

        expect(createSessionRequestJson.billingAddress.street).to.equal(ctpCartWithCustomer.billingAddress.streetName)
        expect(createSessionRequestJson.billingAddress.houseNumberOrName).to.equal(
            ctpCartWithCustomer.billingAddress.streetNumber
        )
        expect(createSessionRequestJson.billingAddress.city).to.equal(ctpCartWithCustomer.billingAddress.city)
        expect(createSessionRequestJson.billingAddress.postalCode).to.equal(
            ctpCartWithCustomer.billingAddress.postalCode
        )
        expect(createSessionRequestJson.billingAddress.country).to.equal(ctpCartWithCustomer.billingAddress.country)
        expect(createSessionRequestJson.shopperEmail).to.equal(ctpCartWithCustomer.customerEmail)

        expect(createSessionRequestJson.dateOfBirth).to.equal(ctpCustomer.dateOfBirth)
        expect(createSessionRequestJson.accountInfo.accountCreationDate).to.equal(ctpCustomer.createdAt)
        expect(createSessionRequestJson.accountInfo.accountChangeDate).to.equal(ctpCustomer.lastModifiedAt)
        expect(createSessionRequestJson.accountInfo.accountAgeIndicator).to.equal('moreThan60Days')
        expect(createSessionRequestJson.accountInfo.accountChangeIndicator).to.equal('moreThan60Days')
        expect(createSessionRequestJson.shopperName.firstName).to.equal(ctpCustomer.firstName)
        expect(createSessionRequestJson.shopperName.lastName).to.equal(ctpCustomer.lastName)
    },
  )

  it(
    'when createSessionRequest doesn\'t contain any additional fields, ' +
    'and cart also doesn\'t contain any of fields like billingAddress, shippingAddress, lineItems, customLineItems, ' +
    'then createSessionRequest will not have any additional fields',
    async () => {
        mockCtpEnpoints._mockCtpCartsEndpoint(ctpCartWithNoData, commercetoolsProjectKey)
        scope.post('/sessions').reply(200, createSessionSuccessResponse)

        const response =
            await createSessionRequestPaymentHandler.execute(paymentObject)

        expect(response.actions).to.have.lengthOf(3)
        const createSessionRequestInteraction = JSON.parse(
            response.actions.find((a) => a.action === 'addInterfaceInteraction')
                .fields.request,
        )
        const createSessionRequestJson = JSON.parse(
            createSessionRequestInteraction.body,
        )

        expect(createSessionRequestJson).to.deep.equal(getSessionRequest)
    },
  )
})
