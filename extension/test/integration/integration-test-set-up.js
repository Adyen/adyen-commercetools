import _ from 'lodash'
import utils from '../../src/utils.js'

let currency = 'EUR'

function initCurrency(value) {
  currency = value
}

async function _ensureCtpResources({
  ctpClient,
  adyenMerchantAccount,
  commercetoolsProjectKey,
}) {
  const {
    body: { id: zoneId },
  } = await _ensureZones(ctpClient)
  const {
    body: { id: taxCategoryId },
  } = await _ensureTaxCategories(ctpClient)
  const {
    body: { id: productTypeId },
  } = await _ensureProductTypes(ctpClient)
  const {
    body: { id: shippingMethodId },
  } = await _ensureShippingMethods(ctpClient, taxCategoryId, zoneId)
  const {
    body: { id: cartDiscountId },
  } = await _ensureCartDiscount(ctpClient)
  const {
    body: { id: cartDiscountMultiBuyId },
  } = await _ensureCartDiscountMultiBuy(ctpClient)
  const {
    body: { id: cartDiscountShippingId },
  } = await _ensureCartDiscountShipping(ctpClient)
  const {
    body: { code: discountCode },
  } = await _ensureDiscountCode(ctpClient, cartDiscountId)
  const {
    body: { code: discountCodeMultiBuy },
  } = await _ensureDiscountCodeMultiBuy(ctpClient, cartDiscountMultiBuyId)
  const {
    body: { code: discountCodeShipping },
  } = await _ensureDiscountCodeShipping(ctpClient, cartDiscountShippingId)
  const {
    body: { id: productId },
  } = await _ensureProducts(ctpClient, productTypeId, taxCategoryId)
  const { body: paymentResponse } = await _ensurePayment({
    ctpClient,
    adyenMerchantAccount,
    commercetoolsProjectKey,
  })
  const paymentId = paymentResponse.id
  await _createCart(ctpClient, productId, paymentId, shippingMethodId, [
    discountCode,
    discountCodeMultiBuy,
    discountCodeShipping,
  ])
  return paymentResponse
}

async function _ensureZones(ctpClient) {
  const ctpZone = await utils.readAndParseJsonFile(
    'test/integration/fixtures/ctp-zone.json',
  )
  const { body } = await ctpClient.fetch(
    ctpClient.builder.zones.where(`key="${ctpZone.key}"`),
  )
  if (body.results.length === 0)
    return ctpClient.create(ctpClient.builder.zones, ctpZone)
  return { body: body.results[0] }
}

async function _ensureTaxCategories(ctpClient) {
  const ctpTaxCategory = await utils.readAndParseJsonFile(
    'test/integration/fixtures/ctp-tax-category.json',
  )
  const { body } = await ctpClient.fetch(
    ctpClient.builder.taxCategories.where(`key="${ctpTaxCategory.key}"`),
  )
  if (body.results.length === 0)
    return ctpClient.create(ctpClient.builder.taxCategories, ctpTaxCategory)
  return { body: body.results[0] }
}

async function _ensureShippingMethods(ctpClient, taxCategoryId, zoneId) {
  const ctpShippingMethod = await utils.readAndParseJsonFile(
    'test/integration/fixtures/ctp-shipping-method.json',
  )
  const { body } = await ctpClient.fetch(
    ctpClient.builder.shippingMethods.where(`key="${ctpShippingMethod.key}"`),
  )
  if (body.results.length === 0) {
    const ctpShippingMethodClone = _.cloneDeep(ctpShippingMethod)
    ctpShippingMethodClone.taxCategory.id = taxCategoryId
    ctpShippingMethodClone.zoneRates[0].zone.id = zoneId
    return ctpClient.create(
      ctpClient.builder.shippingMethods,
      ctpShippingMethodClone,
    )
  }
  return { body: body.results[0] }
}

async function _ensureProductTypes(ctpClient) {
  const ctpProductType = await utils.readAndParseJsonFile(
    'test/integration/fixtures/ctp-product-type.json',
  )
  const { body } = await ctpClient.fetch(
    ctpClient.builder.productTypes.where(`key="${ctpProductType.key}"`),
  )
  if (body.results.length === 0)
    return ctpClient.create(ctpClient.builder.productTypes, ctpProductType)
  return { body: body.results[0] }
}

async function _ensureCartDiscount(ctpClient) {
  const ctpCartDiscount = await utils.readAndParseJsonFile(
    'test/integration/fixtures/ctp-cart-discount.json',
  )
  const { body } = await ctpClient.fetch(
    ctpClient.builder.cartDiscounts.where(`key="${ctpCartDiscount.key}"`),
  )
  if (body.results.length === 0)
    return ctpClient.create(ctpClient.builder.cartDiscounts, ctpCartDiscount)
  return { body: body.results[0] }
}

async function _ensureCartDiscountMultiBuy(ctpClient) {
  const ctpCartDiscountMultiBuy = await utils.readAndParseJsonFile(
    'test/integration/fixtures/ctp-cart-discount-multi-buy.json',
  )
  const { body } = await ctpClient.fetch(
    ctpClient.builder.cartDiscounts.where(
      `key="${ctpCartDiscountMultiBuy.key}"`,
    ),
  )
  if (body.results.length === 0)
    return ctpClient.create(
      ctpClient.builder.cartDiscounts,
      ctpCartDiscountMultiBuy,
    )
  return { body: body.results[0] }
}

async function _ensureCartDiscountShipping(ctpClient) {
  const ctpCartDiscountShipping = await utils.readAndParseJsonFile(
    'test/integration/fixtures/ctp-cart-discount-shipping.json',
  )
  const { body } = await ctpClient.fetch(
    ctpClient.builder.cartDiscounts.where(
      `key="${ctpCartDiscountShipping.key}"`,
    ),
  )
  if (body.results.length === 0)
    return ctpClient.create(
      ctpClient.builder.cartDiscounts,
      ctpCartDiscountShipping,
    )
  return { body: body.results[0] }
}

async function _ensureDiscountCode(ctpClient, cartDiscountId) {
  const ctpDiscountCode = await utils.readAndParseJsonFile(
    'test/integration/fixtures/ctp-discount-code.json',
  )
  const { body } = await ctpClient.fetch(
    ctpClient.builder.discountCodes.where(`code="${ctpDiscountCode.code}"`),
  )
  if (body.results.length === 0) {
    const ctpDiscountCodeClone = _.cloneDeep(ctpDiscountCode)
    ctpDiscountCodeClone.cartDiscounts[0].id = cartDiscountId
    return ctpClient.create(
      ctpClient.builder.discountCodes,
      ctpDiscountCodeClone,
    )
  }
  return { body: body.results[0] }
}

async function _ensureDiscountCodeMultiBuy(ctpClient, cartDiscountId) {
  const ctpDiscountCodeMultiBuy = await utils.readAndParseJsonFile(
    'test/integration/fixtures/ctp-discount-code-multi-buy.json',
  )
  const { body } = await ctpClient.fetch(
    ctpClient.builder.discountCodes.where(
      `code="${ctpDiscountCodeMultiBuy.code}"`,
    ),
  )
  if (body.results.length === 0) {
    const ctpDiscountCodeMultiBuyClone = _.cloneDeep(ctpDiscountCodeMultiBuy)
    ctpDiscountCodeMultiBuyClone.cartDiscounts[0].id = cartDiscountId
    return ctpClient.create(
      ctpClient.builder.discountCodes,
      ctpDiscountCodeMultiBuyClone,
    )
  }
  return { body: body.results[0] }
}

async function _ensureDiscountCodeShipping(ctpClient, cartDiscountId) {
  const ctpDiscountCodeShipping = await utils.readAndParseJsonFile(
    'test/integration/fixtures/ctp-discount-code-shipping.json',
  )
  const { body } = await ctpClient.fetch(
    ctpClient.builder.discountCodes.where(
      `code="${ctpDiscountCodeShipping.code}"`,
    ),
  )
  if (body.results.length === 0) {
    const ctpDiscountCodeShippingClone = _.cloneDeep(ctpDiscountCodeShipping)
    ctpDiscountCodeShippingClone.cartDiscounts[0].id = cartDiscountId
    return ctpClient.create(
      ctpClient.builder.discountCodes,
      ctpDiscountCodeShippingClone,
    )
  }
  return { body: body.results[0] }
}

async function _ensureProducts(ctpClient, productTypeId, taxCategoryId) {
  const ctpProductUsd = await utils.readAndParseJsonFile(
    'test/integration/fixtures/usd/ctp-product.json',
  )
  const ctpProduct = await utils.readAndParseJsonFile(
    'test/integration/fixtures/ctp-product.json',
  )
  const productKey = currency === 'USD' ? ctpProductUsd.key : ctpProduct.key

  const { body } = await ctpClient.fetch(
    ctpClient.builder.products.where(`key="${productKey}"`),
  )
  if (body.results.length === 0) {
    let ctpProductClone
    if (currency === 'USD') ctpProductClone = _.cloneDeep(ctpProductUsd)
    else ctpProductClone = _.cloneDeep(ctpProduct)
    ctpProductClone.productType.id = productTypeId
    ctpProductClone.taxCategory.id = taxCategoryId
    const { body: product } = await ctpClient.create(
      ctpClient.builder.products,
      ctpProductClone,
    )
    return _publish(ctpClient, product)
  }
  return { body: body.results[0] }
}

async function _publish(ctpClient, product) {
  const uri = ctpClient.builder.products
  const actions = [
    {
      action: 'publish',
    },
  ]
  return ctpClient.update(uri, product.id, product.version, actions)
}

async function _ensurePayment({
  ctpClient,
  adyenMerchantAccount,
  commercetoolsProjectKey,
}) {
  const ctpPayment = await utils.readAndParseJsonFile(
    'test/integration/fixtures/ctp-payment.json',
  )
  const ctpPaymentUsd = await utils.readAndParseJsonFile(
    'test/integration/fixtures/usd/ctp-payment.json',
  )
  if (currency === 'USD') {
    ctpPaymentUsd.custom.fields.adyenMerchantAccount = adyenMerchantAccount
    ctpPaymentUsd.custom.fields.commercetoolsProjectKey =
      commercetoolsProjectKey
    return ctpClient.create(ctpClient.builder.payments, ctpPaymentUsd)
  }
  ctpPayment.custom.fields.adyenMerchantAccount = adyenMerchantAccount
  ctpPayment.custom.fields.commercetoolsProjectKey = commercetoolsProjectKey
  return ctpClient.create(ctpClient.builder.payments, ctpPayment)
}

async function _createCart(
  ctpClient,
  productId,
  paymentId,
  shippingMethodId,
  discountCodes,
) {
  const ctpCartUsd = await utils.readAndParseJsonFile(
    'test/integration/fixtures/usd/ctp-cart.json',
  )
  const ctpCart = await utils.readAndParseJsonFile(
    'test/integration/fixtures/ctp-cart.json',
  )
  let ctpCartClone
  if (currency === 'USD') ctpCartClone = _.cloneDeep(ctpCartUsd)
  else ctpCartClone = _.cloneDeep(ctpCart)
  ctpCartClone.lineItems[0].productId = productId
  ctpCartClone.shippingMethod.id = shippingMethodId
  const { body: cartResponse } = await ctpClient.create(
    ctpClient.builder.carts,
    ctpCartClone,
  )
  return ctpClient.update(
    ctpClient.builder.carts,
    cartResponse.id,
    cartResponse.version,
    [
      { action: 'addPayment', payment: { type: 'payment', id: paymentId } },
      ...discountCodes.map((code) => ({ action: 'addDiscountCode', code })),
      {
        action: 'setCustomShippingMethod',
        shippingMethodName: 'testCustomShippingMethod',
        shippingRate: {
          price: {
            currencyCode: currency,
            centAmount: 4200,
          },
        },
        taxCategory: { typeId: 'tax-category', key: 'standard' },
      },
    ],
  )
}

async function initPaymentWithCart({
  ctpClient,
  adyenMerchantAccount,
  commercetoolsProjectKey,
}) {
  return _ensureCtpResources({
    ctpClient,
    adyenMerchantAccount,
    commercetoolsProjectKey,
  })
}

export { initPaymentWithCart, initCurrency }
