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

      const result = await mappingCartDataUtils.getDataFromCart(
        {},
        paymentObject,
        ctpProjectKey,
      )

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
      expect(
        result.additionalData['enhancedSchemeData.shipFromPostalCode'],
      ).to.equal(ctpCartUS.lineItems[0].supplyChannel.obj.address.postalCode)
    })

    it('should map all enhanced scheme data fields', async () => {
      const paymentObject = { id: 'payment-us-123' }
      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCartUS, ctpProjectKey)

      const result = await mappingCartDataUtils.getDataFromCart(
        { paymentMethod: { type: 'scheme' } },
        paymentObject,
        ctpProjectKey,
      )

      expect(
        result.additionalData['enhancedSchemeData.customerReference'],
      ).to.equal(ctpCartUS.customerId ?? ctpCartUS.customerEmail)
      expect(
        result.additionalData['enhancedSchemeData.destinationCountryCode'],
      ).to.equal(ctpCartUS.shippingAddress.country)
      expect(
        result.additionalData['enhancedSchemeData.destinationPostalCode'],
      ).to.equal(ctpCartUS.shippingAddress.postalCode)
      expect(result.additionalData['enhancedSchemeData.orderDate']).to.match(
        /^\d{6}$/,
      )
      expect(
        result.additionalData['enhancedSchemeData.totalTaxAmount'],
      ).to.equal(ctpCartUS.taxedPrice.totalTax.centAmount)
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

      expect(
        result.additionalData['enhancedSchemeData.freightAmount'],
      ).to.equal(ctpCartUS.shippingInfo.taxedPrice.totalNet.centAmount)

      // Without tax rate
      const cartWithoutTax = cloneDeep(ctpCartUS)
      delete cartWithoutTax.shippingInfo.taxRate
      mockCtpEnpoints._mockCtpCartsEndpoint(cartWithoutTax, ctpProjectKey)

      result = await mappingCartDataUtils.getDataFromCart(
        { paymentMethod: { type: 'scheme' } },
        paymentObject,
        ctpProjectKey,
      )

      expect(
        result.additionalData['enhancedSchemeData.freightAmount'],
      ).to.equal(ctpCartUS.shippingInfo.price.centAmount)
    })

    it('should not override existing freight amount', async () => {
      const paymentObject = { id: 'payment-us-123' }
      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCartUS, ctpProjectKey)

      const requestObj = {
        paymentMethod: { type: 'scheme' },
        additionalData: {
          enhancedSchemeData: {
            freightAmount: 9999,
          },
        },
      }

      const result = await mappingCartDataUtils.getDataFromCart(
        requestObj,
        paymentObject,
        ctpProjectKey,
      )

      expect(
        result.additionalData['enhancedSchemeData.freightAmount'],
      ).to.equal(9999)
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

      // New logic: unitPrice = (totalAmount + discountAmount) / quantity
      // where totalAmount is calculated from totalNet with discounts
      const lineItem = ctpCartUS.lineItems[0]
      let totalAmount = lineItem.taxedPrice.totalNet.centAmount // 10000
      let totalDiscount = 0

      // Calculate discounts from discountedPricePerQuantity
      lineItem.discountedPricePerQuantity.forEach((dpq) => {
        if (dpq.discountedPrice?.includedDiscounts) {
          dpq.discountedPrice.includedDiscounts.forEach((discount) => {
            totalDiscount += discount.discountedAmount.centAmount * dpq.quantity
          })
        }
      })

      const expectedUnitPrice = parseInt(
        ((totalAmount + totalDiscount) / lineItem.quantity).toFixed(0),
        10,
      )
      expect(
        result.additionalData['enhancedSchemeData.itemDetailLine1.unitPrice'],
      ).to.equal(expectedUnitPrice)

      const cartWithoutTax = cloneDeep(ctpCartUS)
      delete cartWithoutTax.lineItems[0].taxRate
      mockCtpEnpoints._mockCtpCartsEndpoint(cartWithoutTax, ctpProjectKey)

      result = await mappingCartDataUtils.getDataFromCart(
        { paymentMethod: { type: 'scheme' } },
        paymentObject,
        ctpProjectKey,
      )

      // Without taxRate: uses price.value.centAmount but still goes through discount calculation
      const lineItemNoTax = cartWithoutTax.lineItems[0]
      let totalAmountNoTax = lineItemNoTax.price.value.centAmount
      let totalDiscountNoTax = 0

      // Calculate discounts from discountedPricePerQuantity
      lineItemNoTax.discountedPricePerQuantity?.forEach((dpq) => {
        if (dpq.discountedPrice?.includedDiscounts) {
          dpq.discountedPrice.includedDiscounts.forEach((discount) => {
            totalDiscountNoTax +=
              discount.discountedAmount.centAmount * dpq.quantity
          })
        }
      })

      const expectedUnitPriceNoTax = parseInt(
        (
          (totalAmountNoTax + totalDiscountNoTax) /
          lineItemNoTax.quantity
        ).toFixed(0),
        10,
      )
      expect(
        result.additionalData['enhancedSchemeData.itemDetailLine1.unitPrice'],
      ).to.equal(expectedUnitPriceNoTax)
    })

    it('should not include extra fields for non-US domestic payment', async () => {
      const paymentObject = { id: 'b0273140-0cd5-4ce8-af13-6d53541565b9' }
      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCart, ctpProjectKey)

      const result = await mappingCartDataUtils.getDataFromCart(
        { paymentMethod: { type: 'scheme' } },
        paymentObject,
        ctpProjectKey,
      )

      // Only US-specific extra fields should be undefined for non-US payments
      expect(
        result.additionalData['enhancedSchemeData.itemDetailLine1.productCode'],
      ).to.be.undefined
      expect(
        result.additionalData['enhancedSchemeData.itemDetailLine1.description'],
      ).to.be.undefined
      expect(
        result.additionalData[
          'enhancedSchemeData.itemDetailLine1.unitOfMeasure'
        ],
      ).to.be.undefined
      expect(
        result.additionalData[
          'enhancedSchemeData.itemDetailLine1.commodityCode'
        ],
      ).to.be.undefined

      // Basic item detail fields (quantity, unitPrice, discountAmount, totalAmount) are now set for all payments
      expect(
        result.additionalData['enhancedSchemeData.itemDetailLine1.quantity'],
      ).to.exist
      expect(
        result.additionalData['enhancedSchemeData.itemDetailLine1.unitPrice'],
      ).to.exist
      expect(
        result.additionalData[
          'enhancedSchemeData.itemDetailLine1.discountAmount'
        ],
      ).to.exist
      expect(
        result.additionalData['enhancedSchemeData.itemDetailLine1.totalAmount'],
      ).to.exist
    })

    it('should calculate discount amount for US domestic payment', async () => {
      const paymentObject = { id: 'payment-us-123' }
      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCartUS, ctpProjectKey)

      const result = await mappingCartDataUtils.getDataFromCart(
        { paymentMethod: { type: 'scheme' } },
        paymentObject,
        ctpProjectKey,
      )

      expect(
        result.additionalData[
          'enhancedSchemeData.itemDetailLine1.discountAmount'
        ],
      ).to.equal(1000)
    })

    it('should map custom line items for US domestic payment', async () => {
      const paymentObject = { id: 'payment-us-123' }
      mockCtpEnpoints._mockCtpCartsEndpoint(ctpCartUS, ctpProjectKey)

      const result = await mappingCartDataUtils.getDataFromCart(
        { paymentMethod: { type: 'scheme' } },
        paymentObject,
        ctpProjectKey,
      )

      expect(
        result.additionalData['enhancedSchemeData.itemDetailLine2.quantity'],
      ).to.equal(ctpCartUS.customLineItems[0].quantity)
      expect(
        result.additionalData['enhancedSchemeData.itemDetailLine2.productCode'],
      ).to.equal(ctpCartUS.customLineItems[0].key)
      expect(
        result.additionalData['enhancedSchemeData.itemDetailLine2.description'],
      ).to.equal(ctpCartUS.customLineItems[0].name.en)
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
                id: ctpCartUS.lineItems[0].id,
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

      expect(
        result.additionalData['enhancedSchemeData.itemDetailLine1.quantity'],
      ).to.equal(10)
      expect(
        result.additionalData['enhancedSchemeData.itemDetailLine1.unitPrice'],
      ).to.equal(8888)
      expect(
        result.additionalData['enhancedSchemeData.itemDetailLine1.productCode'],
      ).to.equal('CUSTOM')
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
