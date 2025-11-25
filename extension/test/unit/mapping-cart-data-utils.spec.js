import { expect } from 'chai'
import nock from 'nock'
import lodash from 'lodash'
import config from '../../src/config/config.js'
import mappingCartDataUtils from '../../src/paymentHandler/mapping-cart-data-utils.js'
import mockCtpEnpoints from './mock-ctp-enpoints.js'
import utils from '../../src/utils.js'

const { cloneDeep } = lodash

describe('mapping-cart-data-utils::getDataFromCart', () => {
  let ctpCart
  let ctpCartWithCustomer
  let ctpCartUS
  let ctpCustomer
  const ctpProjectKey = config.getAllCtpProjectKeys()[0]

  before(async () => {
    ctpCart = await utils.readAndParseJsonFile(
      'test/unit/fixtures/ctp-cart.json',
    )
    ctpCartWithCustomer = await utils.readAndParseJsonFile(
      'test/unit/fixtures/ctp-cart-with-customer.json',
    )
    ctpCartUS = await utils.readAndParseJsonFile(
      'test/unit/fixtures/ctp-cart-us.json',
    )
    ctpCustomer = await utils.readAndParseJsonFile(
      'test/unit/fixtures/ctp-customer.json',
    )
  })

  afterEach(() => {
    nock.cleanAll()
  })

  describe('main flow', () => {
    it('should fetch matching cart and map cart data', async () => {
      const paymentObject = { id: 'b0273140-0cd5-4ce8-af13-6d53541565b9' }
      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCart, ctpProjectKey)

      const result = await mappingCartDataUtils.getDataFromCart(
        {},
        paymentObject,
        ctpProjectKey,
      )

      expect(result).to.exist
      expect(result.billingAddress).to.exist
      expect(result.deliveryAddress).to.exist
    })

    it('should fetch cart and customer when customerId exists', async () => {
      const paymentObject = { id: 'b0273140-0cd5-4ce8-af13-6d53541565b9' }
      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCartWithCustomer, ctpProjectKey)
      mockCtpEnpoints._mockCtpCustomerEndpoint(ctpCustomer, ctpProjectKey)

      const result = await mappingCartDataUtils.getDataFromCart(
        {},
        paymentObject,
        ctpProjectKey,
      )

      expect(result.shopperName.firstName).to.equal(ctpCustomer.firstName)
      expect(result.shopperName.lastName).to.equal(ctpCustomer.lastName)
    })

    it('should return original requestObj when no cart is found', async () => {
      mockCtpEnpoints._mockCtpCartsEndpoint(null, ctpProjectKey)
      const requestObj = { amount: 1000, reference: 'TEST' }

      const result = await mappingCartDataUtils.getDataFromCart(
        requestObj,
        { id: 'non-existent-payment' },
        ctpProjectKey,
      )

      expect(result).to.deep.equal(requestObj)
    })
  })
  
  describe('cart basic fields mapping', () => {
    it('should map basic fields from cart', async () => {
      const paymentObject = { id: 'payment-us-123' }
      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCartUS, ctpProjectKey)

      const result = await mappingCartDataUtils.getDataFromCart({}, paymentObject, ctpProjectKey)

      expect(result.countryCode).to.equal(ctpCartUS.country)
      expect(result.shopperLocale).to.equal(ctpCartUS.locale)
    })

    it('should not override existing basic fields', async () => {
      const paymentObject = { id: 'b0273140-0cd5-4ce8-af13-6d53541565b9' }
      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCart, ctpProjectKey)

      const requestObj = {
        countryCode: 'US',
        shopperEmail: 'existing@test.com',
        shopperLocale: 'de-DE',
      }

      const result = await mappingCartDataUtils.getDataFromCart(
        requestObj,
        paymentObject,
        ctpProjectKey,
      )

      expect(result.countryCode).to.equal('US')
      expect(result.shopperEmail).to.equal('existing@test.com')
      expect(result.shopperLocale).to.equal('de-DE')
    })
  })

  describe('enhanced scheme data for scheme payments', () => {
    it('should map additional data for scheme payment with US billing', async () => {
      const paymentObject = { id: 'payment-us-123' }
      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCartUS, ctpProjectKey)

      const result = await mappingCartDataUtils.getDataFromCart(
        { paymentMethod: { type: 'scheme' } },
        paymentObject,
        ctpProjectKey,
      )

      expect(result.additionalData).to.exist
      expect(result.additionalData.enhancedSchemeData).to.exist
      expect(result.additionalData.enhancedSchemeData.shipFromPostalCode).to.equal(
        ctpCartUS.lineItems[0].supplyChannel.obj.address.postalCode,
      )
    })
    
    it('should map all enhanced scheme data fields', async () => {
      const paymentObject = { id: 'payment-us-123' }
      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCartUS, ctpProjectKey)

      const result = await mappingCartDataUtils.getDataFromCart(
        { paymentMethod: { type: 'scheme' } },
        paymentObject,
        ctpProjectKey,
      )

      const enhancedSchemeData = result.additionalData.enhancedSchemeData
      expect(enhancedSchemeData.customerReference).to.equal(ctpCartUS.customerId)
      expect(enhancedSchemeData.destinationCountryCode).to.equal(ctpCartUS.shippingAddress.country)
      expect(enhancedSchemeData.destinationPostalCode).to.equal(ctpCartUS.shippingAddress.postalCode)
      expect(enhancedSchemeData.orderDate).to.match(/^\d{6}$/)
      expect(enhancedSchemeData.totalTaxAmount).to.equal(ctpCartUS.taxedPrice.totalTax.centAmount)
    })

    it('should map freight amount with or without tax rate', async () => {
      // With tax rate
      const paymentObject = { id: 'payment-us-123' }
      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCartUS, ctpProjectKey)

      let result = await mappingCartDataUtils.getDataFromCart(
        { paymentMethod: { type: 'scheme' } },
        paymentObject,
        ctpProjectKey,
      )

      expect(result.additionalData.enhancedSchemeData.freightAmount).to.equal(
        ctpCartUS.shippingInfo.taxedPrice.totalGross.centAmount,
      )

      // Without tax rate
      const cartWithoutTax = cloneDeep(ctpCartUS)
      delete cartWithoutTax.shippingInfo.taxRate
      mockCtpEnpoints._mockCtpCartsEndpoint(cartWithoutTax, ctpProjectKey)

      result = await mappingCartDataUtils.getDataFromCart(
        { paymentMethod: { type: 'scheme' } },
        paymentObject,
        ctpProjectKey,
      )

      expect(result.additionalData.enhancedSchemeData.freightAmount).to.equal(
        ctpCartUS.shippingInfo.price.centAmount,
      )
    })

    it('should not override existing freight amount', async () => {
      const paymentObject = { id: 'payment-us-123' }
      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCartUS, ctpProjectKey)

      const requestObj = {
        paymentMethod: { type: 'scheme' },
        additionalData: { enhancedSchemeData: { freightAmount: 9999 } },
      }

      const result = await mappingCartDataUtils.getDataFromCart(
        requestObj,
        paymentObject,
        ctpProjectKey,
      )

      expect(result.additionalData.enhancedSchemeData.freightAmount).to.equal(9999)
    })
  })

  describe('item detail lines mapping for US domestic payments', () => {
    it('should calculate unit price from taxed price or use price value', async () => {
      const paymentObject = { id: 'payment-us-123' }

      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCartUS, ctpProjectKey)
      let result = await mappingCartDataUtils.getDataFromCart(
        { paymentMethod: { type: 'scheme' } },
        paymentObject,
        ctpProjectKey,
      )

      let firstItem = result.additionalData.enhancedSchemeData.itemDetailLine['itemDetailLine[0]']
      const expectedUnitPrice = parseInt(
        (ctpCartUS.lineItems[0].taxedPrice.totalGross.centAmount / ctpCartUS.lineItems[0].quantity).toFixed(0),
        10,
      )
      expect(firstItem.unitPrice).to.equal(expectedUnitPrice)

      const cartWithoutTax = cloneDeep(ctpCartUS)
      delete cartWithoutTax.lineItems[0].taxRate
      mockCtpEnpoints._mockCtpCartsEndpoint(cartWithoutTax, ctpProjectKey)

      result = await mappingCartDataUtils.getDataFromCart(
        { paymentMethod: { type: 'scheme' } },
        paymentObject,
        ctpProjectKey,
      )

      firstItem = result.additionalData.enhancedSchemeData.itemDetailLine['itemDetailLine[0]']
      expect(firstItem.unitPrice).to.equal(ctpCartUS.lineItems[0].price.value.centAmount)
    })

    it('should not include extra fields for non-US domestic payment', async () => {
      const paymentObject = { id: 'b0273140-0cd5-4ce8-af13-6d53541565b9' }
      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCart, ctpProjectKey)

      const result = await mappingCartDataUtils.getDataFromCart(
        { paymentMethod: { type: 'scheme' } },
        paymentObject,
        ctpProjectKey,
      )

      const firstItem = result.additionalData.enhancedSchemeData.itemDetailLine['itemDetailLine[0]']
      expect(firstItem.productCode).to.be.undefined
      expect(firstItem.description).to.be.undefined
      expect(firstItem.unitOfMeasure).to.be.undefined
      expect(firstItem.commodityCode).to.be.undefined
      expect(firstItem.discountAmount).to.be.undefined
    })

    it('should calculate discount amount for US domestic payment', async () => {
      const paymentObject = { id: 'payment-us-123' }
      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCartUS, ctpProjectKey)

      const result = await mappingCartDataUtils.getDataFromCart(
        { paymentMethod: { type: 'scheme' } },
        paymentObject,
        ctpProjectKey,
      )

      const firstItem = result.additionalData.enhancedSchemeData.itemDetailLine['itemDetailLine[0]']
      expect(firstItem.discountAmount).to.equal(1000)
    })

    it('should map custom line items for US domestic payment', async () => {
      const paymentObject = { id: 'payment-us-123' }
      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCartUS, ctpProjectKey)

      const result = await mappingCartDataUtils.getDataFromCart(
        { paymentMethod: { type: 'scheme' } },
        paymentObject,
        ctpProjectKey,
      )

      const customItem = result.additionalData.enhancedSchemeData.itemDetailLine['itemDetailLine[1]']
      expect(customItem.quantity).to.equal(ctpCartUS.customLineItems[0].quantity)
      expect(customItem.productCode).to.equal(ctpCartUS.customLineItems[0].key)
      expect(customItem.description).to.equal(ctpCartUS.customLineItems[0].name.en)
    })

    it('should handle provided item details', async () => {
      const paymentObject = { id: 'payment-us-123' }
      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCartUS, ctpProjectKey)

      const requestObj = {
        paymentMethod: { type: 'scheme' },
        additionalData: {
          enhancedSchemeData: {
            itemDetailLines: [
              {
                productId: ctpCartUS.lineItems[0].productId,
                quantity: 10,
                unitPrice: 8888,
                productCode: 'CUSTOM',
              },
            ],
          },
        },
      }

      const result = await mappingCartDataUtils.getDataFromCart(
        requestObj,
        paymentObject,
        ctpProjectKey,
      )

      const firstItem = result.additionalData.enhancedSchemeData.itemDetailLine['itemDetailLine[0]']
      expect(firstItem.quantity).to.equal(10)
      expect(firstItem.unitPrice).to.equal(8888)
      expect(firstItem.productCode).to.equal('CUSTOM')
    })
  })

  describe('customer data mapping', () => {
    it('should map customer data when customer exists', async () => {
      const paymentObject = { id: 'b0273140-0cd5-4ce8-af13-6d53541565b9' }
      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCartWithCustomer, ctpProjectKey)
      mockCtpEnpoints._mockCtpCustomerEndpoint(ctpCustomer, ctpProjectKey)

      const result = await mappingCartDataUtils.getDataFromCart(
        {},
        paymentObject,
        ctpProjectKey,
      )

      expect(result.dateOfBirth).to.equal(ctpCustomer.dateOfBirth)
      expect(result.shopperName.firstName).to.equal(ctpCustomer.firstName)
      expect(result.shopperName.lastName).to.equal(ctpCustomer.lastName)
    })

    it('should not override existing customer fields', async () => {
      const paymentObject = { id: 'b0273140-0cd5-4ce8-af13-6d53541565b9' }
      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCartWithCustomer, ctpProjectKey)
      mockCtpEnpoints._mockCtpCustomerEndpoint(ctpCustomer, ctpProjectKey)

      const requestObj = {
        dateOfBirth: '1990-01-01',
        shopperName: { firstName: 'Existing', lastName: 'Name' },
      }

      const result = await mappingCartDataUtils.getDataFromCart(
        requestObj,
        paymentObject,
        ctpProjectKey,
      )

      expect(result.dateOfBirth).to.equal('1990-01-01')
      expect(result.shopperName.firstName).to.equal('Existing')
      expect(result.shopperName.lastName).to.equal('Name')
    })
  })
  
})