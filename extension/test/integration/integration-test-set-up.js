// eslint-disable-next-line import/no-extraneous-dependencies
const localtunnel = require('localtunnel')
const _ = require('lodash')
const ctpZone = require('./fixtures/ctp-zone')
const ctpTaxCategory = require('./fixtures/ctp-tax-category')
const ctpShippingMethod = require('./fixtures/ctp-shipping-method')
const ctpProductType = require('./fixtures/ctp-product-type')
const ctpProduct = require('./fixtures/ctp-product')
const ctpPayment = require('./fixtures/ctp-payment')
const ctpCart = require('./fixtures/ctp-cart')
const ctpCartDiscount = require('./fixtures/ctp-cart-discount')
const ctpCartDiscountMultiBuy = require('./fixtures/ctp-cart-discount-multi-buy')
const ctpCartDiscountShipping = require('./fixtures/ctp-cart-discount-shipping')
const ctpDiscountCode = require('./fixtures/ctp-discount-code')
const ctpDiscountCodeMultiBuy = require('./fixtures/ctp-discount-code-multi-buy')
const ctpDiscountCodeShipping = require('./fixtures/ctp-discount-code-shipping')
const serverBuilder = require('../../src/server')
const { routes } = require('../../src/routes')
const { ensureResources } = require('../../src/config/init/ensure-resources')
const config = require('../../src/config/config')
const testUtils = require('../test-utils')
const logger = require('../../src/utils').getLogger()

let tunnel
let server

function overrideBasicAuthFlag(isEnable) {
  const moduleConfig = config.getModuleConfig()
  moduleConfig.basicAuth = isEnable
  config.getModuleConfig = function getModuleConfig() {
    return moduleConfig
  }
  module.exports = config
}

function _overrideApiExtensionBaseUrlConfig(apiExtensionBaseUrl) {
  const moduleConfig = config.getModuleConfig()
  moduleConfig.apiExtensionBaseUrl = apiExtensionBaseUrl
  config.getModuleConfig = function getModuleConfig() {
    return moduleConfig
  }
  module.exports = config
}

async function initTunnel(port) {
  let repeaterCounter = 0
  // eslint-disable-next-line no-shadow
  let tunnel
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      tunnel = await localtunnel({
        port,
        subdomain: 'ctp-adyen-integration-tests',
      })
      break
    } catch (e) {
      if (repeaterCounter === 10) throw e
      repeaterCounter++
    }
  }
  return tunnel
}

async function initServerAndTunnel() {
  const port = config.getModuleConfig().port || 8000
  server = serverBuilder.setupServer(routes)
  tunnel = await initTunnel(port)
  const apiExtensionBaseUrl = tunnel.url
  _overrideApiExtensionBaseUrlConfig(apiExtensionBaseUrl)

  return new Promise((resolve) => {
    server.listen(port, async () => {
      logger.debug(
        `Extension server is running at ${apiExtensionBaseUrl}:${port}/`
      )
      resolve()
    })
  })
}

async function initResources(ctpClient, ctpProjectKey, authHeaderValue) {
  await testUtils.deleteAllResources(ctpClient, 'payments')
  await testUtils.deleteAllResources(ctpClient, 'types')
  await testUtils.deleteAllResources(ctpClient, 'extensions')
  const { apiExtensionBaseUrl } = config.getModuleConfig()
  await ensureResources(
    ctpClient,
    ctpProjectKey,
    apiExtensionBaseUrl,
    authHeaderValue
  )
}

async function cleanupCtpResources(ctpClient) {
  await testUtils.deleteAllResources(ctpClient, 'discountCodes')
  await testUtils.deleteAllResources(ctpClient, 'carts')
  await testUtils.deleteAllResources(ctpClient, 'payments')
  await testUtils.deleteAllResources(ctpClient, 'products')
  await testUtils.deleteAllResources(ctpClient, 'products')
  await testUtils.deleteAllResources(ctpClient, 'productTypes')
  await testUtils.deleteAllResources(ctpClient, 'shippingMethods')
  await testUtils.deleteAllResources(ctpClient, 'zones')
  await testUtils.deleteAllResources(ctpClient, 'taxCategories')
  await testUtils.deleteAllResources(ctpClient, 'cartDiscounts')
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
  const { body } = await ctpClient.fetch(
    ctpClient.builder.zones.where(`key="${ctpZone.key}"`)
  )
  if (body.results.length === 0)
    return ctpClient.create(ctpClient.builder.zones, ctpZone)
  return { body: body.results[0] }
}

async function _ensureTaxCategories(ctpClient) {
  const { body } = await ctpClient.fetch(
    ctpClient.builder.taxCategories.where(`key="${ctpTaxCategory.key}"`)
  )
  if (body.results.length === 0)
    return ctpClient.create(ctpClient.builder.taxCategories, ctpTaxCategory)
  return { body: body.results[0] }
}

async function _ensureShippingMethods(ctpClient, taxCategoryId, zoneId) {
  const { body } = await ctpClient.fetch(
    ctpClient.builder.shippingMethods.where(`key="${ctpShippingMethod.key}"`)
  )
  if (body.results.length === 0) {
    const ctpShippingMethodClone = _.cloneDeep(ctpShippingMethod)
    ctpShippingMethodClone.taxCategory.id = taxCategoryId
    ctpShippingMethodClone.zoneRates[0].zone.id = zoneId
    return ctpClient.create(
      ctpClient.builder.shippingMethods,
      ctpShippingMethodClone
    )
  }
  return { body: body.results[0] }
}

async function _ensureProductTypes(ctpClient) {
  const { body } = await ctpClient.fetch(
    ctpClient.builder.productTypes.where(`key="${ctpProductType.key}"`)
  )
  if (body.results.length === 0)
    return ctpClient.create(ctpClient.builder.productTypes, ctpProductType)
  return { body: body.results[0] }
}

async function _ensureCartDiscount(ctpClient) {
  const { body } = await ctpClient.fetch(
    ctpClient.builder.cartDiscounts.where(`key="${ctpCartDiscount.key}"`)
  )
  if (body.results.length === 0)
    return ctpClient.create(ctpClient.builder.cartDiscounts, ctpCartDiscount)
  return { body: body.results[0] }
}

async function _ensureCartDiscountMultiBuy(ctpClient) {
  const { body } = await ctpClient.fetch(
    ctpClient.builder.cartDiscounts.where(
      `key="${ctpCartDiscountMultiBuy.key}"`
    )
  )
  if (body.results.length === 0)
    return ctpClient.create(
      ctpClient.builder.cartDiscounts,
      ctpCartDiscountMultiBuy
    )
  return { body: body.results[0] }
}

async function _ensureCartDiscountShipping(ctpClient) {
  const { body } = await ctpClient.fetch(
    ctpClient.builder.cartDiscounts.where(
      `key="${ctpCartDiscountShipping.key}"`
    )
  )
  if (body.results.length === 0)
    return ctpClient.create(
      ctpClient.builder.cartDiscounts,
      ctpCartDiscountShipping
    )
  return { body: body.results[0] }
}

async function _ensureDiscountCode(ctpClient, cartDiscountId) {
  const { body } = await ctpClient.fetch(
    ctpClient.builder.discountCodes.where(`code="${ctpDiscountCode.code}"`)
  )
  if (body.results.length === 0) {
    const ctpDiscountCodeClone = _.cloneDeep(ctpDiscountCode)
    ctpDiscountCodeClone.cartDiscounts[0].id = cartDiscountId
    return ctpClient.create(
      ctpClient.builder.discountCodes,
      ctpDiscountCodeClone
    )
  }
  return { body: body.results[0] }
}

async function _ensureDiscountCodeMultiBuy(ctpClient, cartDiscountId) {
  const { body } = await ctpClient.fetch(
    ctpClient.builder.discountCodes.where(
      `code="${ctpDiscountCodeMultiBuy.code}"`
    )
  )
  if (body.results.length === 0) {
    const ctpDiscountCodeMultiBuyClone = _.cloneDeep(ctpDiscountCodeMultiBuy)
    ctpDiscountCodeMultiBuyClone.cartDiscounts[0].id = cartDiscountId
    return ctpClient.create(
      ctpClient.builder.discountCodes,
      ctpDiscountCodeMultiBuyClone
    )
  }
  return { body: body.results[0] }
}

async function _ensureDiscountCodeShipping(ctpClient, cartDiscountId) {
  const { body } = await ctpClient.fetch(
    ctpClient.builder.discountCodes.where(
      `code="${ctpDiscountCodeShipping.code}"`
    )
  )
  if (body.results.length === 0) {
    const ctpDiscountCodeShippingClone = _.cloneDeep(ctpDiscountCodeShipping)
    ctpDiscountCodeShippingClone.cartDiscounts[0].id = cartDiscountId
    return ctpClient.create(
      ctpClient.builder.discountCodes,
      ctpDiscountCodeShippingClone
    )
  }
  return { body: body.results[0] }
}

async function _ensureProducts(ctpClient, productTypeId, taxCategoryId) {
  const { body } = await ctpClient.fetch(
    ctpClient.builder.products.where(`key="${ctpProduct.key}"`)
  )
  if (body.results.length === 0) {
    const ctpProductClone = _.cloneDeep(ctpProduct)
    ctpProductClone.productType.id = productTypeId
    ctpProductClone.taxCategory.id = taxCategoryId
    const { body: product } = await ctpClient.create(
      ctpClient.builder.products,
      ctpProductClone
    )
    return testUtils.publish(ctpClient, product)
  }
  return { body: body.results[0] }
}

async function _ensurePayment({
  ctpClient,
  adyenMerchantAccount,
  commercetoolsProjectKey,
}) {
  const { body } = await ctpClient.fetch(
    ctpClient.builder.payments.where(`key="${ctpPayment.key}"`)
  )
  if (body.results.length === 0) {
    ctpPayment.custom.fields.adyenMerchantAccount = adyenMerchantAccount
    ctpPayment.custom.fields.commercetoolsProjectKey = commercetoolsProjectKey
    return ctpClient.create(ctpClient.builder.payments, ctpPayment)
  }
  return { body: body.results[0] }
}

async function _createCart(
  ctpClient,
  productId,
  paymentId,
  shippingMethodId,
  discountCodes
) {
  const ctpCartClone = _.cloneDeep(ctpCart)
  ctpCartClone.lineItems[0].productId = productId
  ctpCartClone.shippingMethod.id = shippingMethodId
  const { body: cartResponse } = await ctpClient.create(
    ctpClient.builder.carts,
    ctpCartClone
  )
  return ctpClient.update(
    ctpClient.builder.carts,
    cartResponse.id,
    cartResponse.version,
    [
      { action: 'addPayment', payment: { type: 'payment', id: paymentId } },
      ...discountCodes.map((code) => ({ action: 'addDiscountCode', code })),
    ]
  )
}

async function initPaymentWithCart({
  ctpClient,
  adyenMerchantAccount,
  commercetoolsProjectKey,
}) {
  const payment = await _ensureCtpResources({
    ctpClient,
    adyenMerchantAccount,
    commercetoolsProjectKey,
  })
  return payment
}

async function stopRunningServers() {
  server.close()
  await tunnel.close()
}

module.exports = {
  stopRunningServers,
  initPaymentWithCart,
  cleanupCtpResources,
  initServerAndTunnel,
  initResources,
  overrideBasicAuthFlag,
}
