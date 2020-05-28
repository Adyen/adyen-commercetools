const { ADYEN_PERCENTAGE_MINOR_UNIT } = require('../config/constants')

const DEFAULT_PAYMENT_LANGUAGE = 'en'

function createLineItems (payment, cart) {
  const lineItems = []
  const locales = _getLocales(cart, payment)

  cart.lineItems.forEach((item) => {
    lineItems.push(_createAdyenLineItemFromLineItem(item, locales))
  })

  cart.customLineItems.forEach((item) => {
    lineItems.push(_createAdyenLineItemFromCustomLineItem(item, locales))
  })

  lineItems.push(_createShippingInfoAdyenLineItem(cart.shippingInfo))

  return lineItems
}

function _getLocales (cart, payment) {
  const locales = []
  let paymentLanguage = payment.custom && payment.custom.fields['languageCode']
  if (!paymentLanguage)
    paymentLanguage = cart.locale
  if (paymentLanguage)
    locales.push(paymentLanguage)
  if (!paymentLanguage || paymentLanguage !== DEFAULT_PAYMENT_LANGUAGE)
    locales.push(DEFAULT_PAYMENT_LANGUAGE)

  return locales
}

function _createAdyenLineItemFromLineItem (ctpLineItem, locales) {
  return {
    id: ctpLineItem.variant.sku,
    quantity: ctpLineItem.quantity,
    description: _localizeOrFallback(ctpLineItem.name, locales, 'item'),
    amountIncludingTax: ctpLineItem.price.value.centAmount,
    taxPercentage: ctpLineItem.taxRate.amount * ADYEN_PERCENTAGE_MINOR_UNIT
  }
}

function _createAdyenLineItemFromCustomLineItem (ctpLineItem, locales) {
  return {
    id: ctpLineItem.id,
    quantity: ctpLineItem.quantity,
    description: _localizeOrFallback(ctpLineItem.name, locales, 'item'),
    amountIncludingTax: ctpLineItem.money.centAmount,
    taxPercentage: ctpLineItem.taxRate.amount * ADYEN_PERCENTAGE_MINOR_UNIT
  }
}

function _createShippingInfoAdyenLineItem (shippingInfo) {
  return {
    id: `${shippingInfo.shippingMethodName}`,
    quantity: 1,
    description: _getShippingMethodDescription(shippingInfo),
    amountIncludingTax: shippingInfo.price.centAmount,
    taxPercentage: shippingInfo.taxRate.amount * ADYEN_PERCENTAGE_MINOR_UNIT
  }
}

function _getShippingMethodDescription (shippingInfo) {
  const shippingMethod = shippingInfo.shippingMethod.obj
  if (shippingMethod)
    return shippingMethod.description
  return `Shipping ${shippingInfo.shippingMethodName}`
}

function _localizeOrFallback (localizedString,
                              locales,
                              fallback) {
  let value
  for (let i = 0; i < locales.length; i++) {
    value = localizedString[locales[i]]
    if (value)
      break
  }
  return value || fallback
}

module.exports = { createLineItems }
