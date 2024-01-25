import _ from 'lodash'
import ctpClientBuilder from '../ctp.js'
import config from '../config/config.js'

const ADYEN_PERCENTAGE_MINOR_UNIT = 10000
const KLARNA_DEFAULT_LINE_ITEM_NAME = 'item'
const KLARNA_DEFAULT_SHIPPING_METHOD_DESCRIPTION = 'shipping'

async function fetchMatchingCart(paymentObject, ctpProjectKey) {
  const ctpConfig = config.getCtpConfig(ctpProjectKey)
  const ctpClient = await ctpClientBuilder.get(ctpConfig)
  const { body } = await ctpClient.fetch(
    ctpClient.builder.carts
      .where(`paymentInfo(payments(id="${paymentObject.id}"))`)
      .expand('shippingInfo.shippingMethod'),
  )
  return body.results[0]
}

function createLineItems(payment, cart) {
  const lineItems = []
  const locales = _getLocales(cart, payment)

  cart.lineItems.forEach((item) => {
    if (item.taxRate)
      lineItems.push(_createAdyenLineItemFromLineItem(item, locales))
  })

  cart.customLineItems.forEach((item) => {
    if (item.taxRate)
      lineItems.push(_createAdyenLineItemFromCustomLineItem(item, locales))
  })

  const { shippingInfo } = cart
  if (shippingInfo && shippingInfo.taxRate)
    lineItems.push(_createShippingInfoAdyenLineItem(shippingInfo, locales))

  return lineItems
}

function _getLocales(cart, payment) {
  const locales = []
  let paymentLanguage = payment.custom && payment.custom.fields['languageCode']
  if (!paymentLanguage) paymentLanguage = cart.locale
  if (paymentLanguage) locales.push(paymentLanguage)
  return locales
}

function _createAdyenLineItemFromLineItem(ctpLineItem, locales) {
  const quantity = ctpLineItem.quantity
  return {
    id: ctpLineItem.variant.sku,
    quantity: ctpLineItem.quantity,
    description: _localizeOrFallback(
      ctpLineItem.name,
      locales,
      KLARNA_DEFAULT_LINE_ITEM_NAME,
    ),
    amountExcludingTax: parseFloat(
      (ctpLineItem.taxedPrice.totalNet.centAmount / quantity).toFixed(0),
    ),
    amountIncludingTax: parseFloat(
      (ctpLineItem.taxedPrice.totalGross.centAmount / quantity).toFixed(0),
    ),
    taxAmount: parseFloat(
      (ctpLineItem.taxedPrice.totalTax.centAmount / quantity).toFixed(0),
    ),
    taxPercentage: ctpLineItem.taxRate.amount * ADYEN_PERCENTAGE_MINOR_UNIT,
  }
}

function _createAdyenLineItemFromCustomLineItem(ctpLineItem, locales) {
  const quantity = ctpLineItem.quantity
  return {
    id: ctpLineItem.id,
    quantity: ctpLineItem.quantity,
    description: _localizeOrFallback(
      ctpLineItem.name,
      locales,
      KLARNA_DEFAULT_LINE_ITEM_NAME,
    ),
    amountExcludingTax: parseFloat(
      (ctpLineItem.taxedPrice.totalNet.centAmount / quantity).toFixed(0),
    ),
    amountIncludingTax: parseFloat(
      (ctpLineItem.taxedPrice.totalGross.centAmount / quantity).toFixed(0),
    ),
    taxAmount: parseFloat(
      (ctpLineItem.taxedPrice.totalTax.centAmount / quantity).toFixed(0),
    ),
    taxPercentage: ctpLineItem.taxRate.amount * ADYEN_PERCENTAGE_MINOR_UNIT,
  }
}

function _createShippingInfoAdyenLineItem(shippingInfo, locales) {
  return {
    id: `${shippingInfo.shippingMethodName}`,
    quantity: 1, // always one shipment item so far
    description:
      _getShippingMethodDescription(shippingInfo, locales) ||
      KLARNA_DEFAULT_SHIPPING_METHOD_DESCRIPTION,
    amountExcludingTax: shippingInfo.taxedPrice.totalNet.centAmount,
    amountIncludingTax: shippingInfo.taxedPrice.totalGross.centAmount,
    taxAmount: shippingInfo.taxedPrice.totalTax.centAmount,
    taxPercentage: shippingInfo.taxRate.amount * ADYEN_PERCENTAGE_MINOR_UNIT,
  }
}

function _getShippingMethodDescription(shippingInfo, locales) {
  const shippingMethod = shippingInfo.shippingMethod?.obj
  if (shippingMethod) {
    return _localizeOrFallback(
      shippingMethod.localizedDescription,
      locales,
      shippingMethod.description,
    )
  }
  return shippingInfo.shippingMethodName
}

function _localizeOrFallback(localizedString, locales, fallback) {
  let result
  if (_.size(localizedString) > 0) {
    const locale = locales?.find((l) => localizedString[l])
    result = localizedString[locale] || Object.values(localizedString)[0]
  } else result = fallback
  return result
}

export default { fetchMatchingCart, createLineItems }
