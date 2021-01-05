const ctpClientBuilder = require('../ctp')
const makePaymentHandler = require('./make-payment.handler')

const ADYEN_PERCENTAGE_MINOR_UNIT = 10000
const DEFAULT_PAYMENT_LANGUAGE = 'en'
const KLARNA_DEFAULT_LINE_ITEM_NAME = 'item'

async function execute(paymentObject) {
  const makePaymentRequestObj = JSON.parse(
    paymentObject.custom.fields.makePaymentRequest
  )
  if (!makePaymentRequestObj.lineItems) {
    const ctpCart = await _fetchMatchingCart(paymentObject)
    if (ctpCart) {
      makePaymentRequestObj.lineItems = createLineItems(paymentObject, ctpCart)
      paymentObject.custom.fields.makePaymentRequest = JSON.stringify(
        makePaymentRequestObj
      )
    }
  }

  return makePaymentHandler.execute(paymentObject)
}

async function _fetchMatchingCart(paymentObject) {
  const ctpClient = ctpClientBuilder.get()
  const { body } = await ctpClient.fetch(
    ctpClient.builder.carts
      .where(`paymentInfo(payments(id="${paymentObject.id}"))`)
      .expand('shippingInfo.shippingMethod')
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
    lineItems.push(_createShippingInfoAdyenLineItem(shippingInfo))

  return lineItems
}

/**
 * There will always be a locale `DEFAULT_PAYMENT_LANGUAGE` as a default fallback.
 * Additionally, another locale from payment custom field `languageCode` OR from cart locale
 * is added if it's different from the `DEFAULT_PAYMENT_LANGUAGE` locale.
 */
function _getLocales(cart, payment) {
  const locales = []
  let paymentLanguage = payment.custom && payment.custom.fields['languageCode']
  if (!paymentLanguage) paymentLanguage = cart.locale
  if (paymentLanguage) locales.push(paymentLanguage)
  if (!paymentLanguage || paymentLanguage !== DEFAULT_PAYMENT_LANGUAGE)
    locales.push(DEFAULT_PAYMENT_LANGUAGE)

  return locales
}

function _createAdyenLineItemFromLineItem(ctpLineItem, locales) {
  return {
    id: ctpLineItem.variant.sku,
    quantity: ctpLineItem.quantity,
    /**
     * The shop can set the language on the payment or on the cart.
     * If it's not set, it will pick `DEFAULT_PAYMENT_LANGUAGE`.
     * If `DEFAULT_PAYMENT_LANGUAGE` is not there, it will just show `KLARNA_DEFAULT_LINE_ITEM_NAME`.
     */
    description: _localizeOrFallback(
      ctpLineItem.name,
      locales,
      KLARNA_DEFAULT_LINE_ITEM_NAME
    ),
    amountIncludingTax: ctpLineItem.price.value.centAmount,
    taxPercentage: ctpLineItem.taxRate.amount * ADYEN_PERCENTAGE_MINOR_UNIT,
  }
}

function _createAdyenLineItemFromCustomLineItem(ctpLineItem, locales) {
  return {
    id: ctpLineItem.id,
    quantity: ctpLineItem.quantity,
    /**
     * The shop can set the language on the payment or on the cart.
     * If it's not set, it will pick `DEFAULT_PAYMENT_LANGUAGE`.
     * If `DEFAULT_PAYMENT_LANGUAGE` is not there, it will just show `KLARNA_DEFAULT_LINE_ITEM_NAME`.
     */
    description: _localizeOrFallback(
      ctpLineItem.name,
      locales,
      KLARNA_DEFAULT_LINE_ITEM_NAME
    ),
    amountIncludingTax: ctpLineItem.money.centAmount,
    taxPercentage: ctpLineItem.taxRate.amount * ADYEN_PERCENTAGE_MINOR_UNIT,
  }
}

function _createShippingInfoAdyenLineItem(shippingInfo) {
  return {
    id: `${shippingInfo.shippingMethodName}`,
    quantity: 1, // always one shipment item so far
    description: _getShippingMethodDescription(shippingInfo),
    amountIncludingTax: shippingInfo.price.centAmount,
    taxPercentage: shippingInfo.taxRate.amount * ADYEN_PERCENTAGE_MINOR_UNIT,
  }
}

function _getShippingMethodDescription(shippingInfo) {
  const shippingMethod = shippingInfo.shippingMethod.obj
  if (shippingMethod) return shippingMethod.description
  return shippingInfo.shippingMethodName
}

function _localizeOrFallback(localizedString, locales, fallback) {
  const locale = locales.find((l) => localizedString[l])
  return locale ? localizedString[locale] : fallback
}

module.exports = { execute }
