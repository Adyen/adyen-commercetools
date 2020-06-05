const ctpClientBuilder = require('../ctp/ctp-client')
const makePaymentHandler = require('./make-payment.handler')

const ADYEN_PERCENTAGE_MINOR_UNIT = 10000
const DEFAULT_PAYMENT_LANGUAGE = 'en'
const KLARNA_DEFAULT_LINE_ITEM_NAME = 'item'

async function execute (paymentObject) {
  const makePaymentRequestObj = JSON.parse(paymentObject.custom.fields.makePaymentRequest)
  if (!makePaymentRequestObj.lineItems) {
    const ctpCart = await _fetchMatchingCart(paymentObject)
    if (ctpCart) {
      makePaymentRequestObj.lineItems = createLineItems(paymentObject, ctpCart)
      paymentObject.custom.fields.makePaymentRequest = JSON.stringify(makePaymentRequestObj)
    }
  }

  return makePaymentHandler.execute(paymentObject)
}

async function _fetchMatchingCart (paymentObject) {
  const ctpClient = ctpClientBuilder.get()
  const { body } = await ctpClient.fetch(ctpClient.builder.carts
    .where(`paymentInfo(payments(id="${paymentObject.id}"))`)
    .expand('shippingInfo.shippingMethod'))
  return body.results[0]
}

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
    description: _localizeOrFallback(ctpLineItem.name, locales, KLARNA_DEFAULT_LINE_ITEM_NAME),
    amountIncludingTax: ctpLineItem.price.value.centAmount,
    taxPercentage: ctpLineItem.taxRate.amount * ADYEN_PERCENTAGE_MINOR_UNIT
  }
}

function _createAdyenLineItemFromCustomLineItem (ctpLineItem, locales) {
  return {
    id: ctpLineItem.id,
    quantity: ctpLineItem.quantity,
    description: _localizeOrFallback(ctpLineItem.name, locales, KLARNA_DEFAULT_LINE_ITEM_NAME),
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
  return shippingInfo.shippingMethodName
}

function _localizeOrFallback (localizedString,
                              locales,
                              fallback) {
  const locale = locales.find(l => localizedString[l])
  return locale ? localizedString[locale] : fallback
}


module.exports = { execute }
