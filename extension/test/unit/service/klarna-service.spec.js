const { expect } = require('chai')
const _ = require('lodash')
const klarnaService = require('../../../src/service/klarna-service')
const ctpCart = require('../fixtures/ctp-cart')

describe('klarna-service::createLineItems', () => {
  const DEFAULT_PAYMENT_LANGUAGE = 'en'
  const KLARNA_DEFAULT_LINE_ITEM_NAME = 'item'

  it('when locale is not existing, ' +
    'it should fall back to default line item name', () => {
    const ctpPayment = {
      custom: {
        fields: {
          languageCode: 'nonExistingLanguageCode'
        }
      }
    }
    const lineItems = klarnaService.createLineItems(ctpPayment, ctpCart)
    expect(lineItems).to.have.lengthOf(3)
    expect(lineItems[0].description).to.equal(KLARNA_DEFAULT_LINE_ITEM_NAME)
    expect(lineItems[1].description).to.equal(ctpCart.customLineItems[0].name[DEFAULT_PAYMENT_LANGUAGE])
    expect(lineItems[2].description).to.equal(ctpCart.shippingInfo.shippingMethod.obj.description)
  })

  it('when shipping info is not expanded, ' +
    'it should return default shipping name', () => {
    const ctpPayment = {
      custom: {
        fields: {
          languageCode: 'nonExistingLanguageCode'
        }
      }
    }
    const clonedCtpCart = _.cloneDeep(ctpCart)
    delete clonedCtpCart.shippingInfo.shippingMethod.obj

    const lineItems = klarnaService.createLineItems(ctpPayment, clonedCtpCart)
    expect(lineItems[2].description).to.equal(ctpCart.shippingInfo.shippingMethodName)
  })

  it('when payment has languageCode, ' +
    'it should take precedence', () => {
    const ctpPayment = {
      custom: {
        fields: {
          languageCode: 'de'
        }
      }
    }
    const clonedCtpCart = _.cloneDeep(ctpCart)
    clonedCtpCart.lineItems[0].name = {
      de: 'test-de',
      fr: 'test-fr',
      at: 'test-at',
      en: 'test-en'
    }
    const lineItems = klarnaService.createLineItems(ctpPayment, clonedCtpCart)
    expect(lineItems[0].description).to.equal('test-de')
  })

  it('when payment has NO languageCode and cart has locale, ' +
    'it should take precedence', () => {
    const ctpPayment = {
      custom: {
        fields: {
        }
      }
    }
    const clonedCtpCart = _.cloneDeep(ctpCart)
    clonedCtpCart.locale = 'fr'
    clonedCtpCart.lineItems[0].name = {
      de: 'test-de',
      fr: 'test-fr',
      at: 'test-at',
      en: 'test-en'
    }
    const lineItems = klarnaService.createLineItems(ctpPayment, clonedCtpCart)
    expect(lineItems[0].description).to.equal('test-fr')
  })

  it('when payment has NO languageCode and cart has NO locale, ' +
    'it should fall back to default language', () => {
    const ctpPayment = {
      custom: {
        fields: {
        }
      }
    }
    const clonedCtpCart = _.cloneDeep(ctpCart)
    clonedCtpCart.lineItems[0].name = {
      de: 'test-de',
      fr: 'test-fr',
      at: 'test-at',
      en: 'test-en'
    }
    const lineItems = klarnaService.createLineItems(ctpPayment, clonedCtpCart)
    expect(lineItems[0].description).to.equal('test-en')
  })
})
