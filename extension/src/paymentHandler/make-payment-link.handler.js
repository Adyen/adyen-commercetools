const { getPaymentLink } = require('../service/web-component-service')
const pU = require('./payment-utils')
const c = require('../config/constants')
const config = require('../config/config')
const ctpClientBuilder = require('../ctp')

async function execute(paymentObject) {
  const makePaymentLinkRequestObj = JSON.parse(
    paymentObject.custom.fields.makePaymentLinkRequest
  )
  const adyenMerchantAccount = paymentObject.custom.fields.adyenMerchantAccount
  const commercetoolsProjectKey =
    paymentObject.custom.fields.commercetoolsProjectKey;

  if (!makePaymentLinkRequestObj.lineItems) {
    const ctpCart = await _fetchMatchingCart(
      paymentObject,
      commercetoolsProjectKey
    );
    if (ctpCart) {
      makePaymentLinkRequestObj.lineItems = createLineItems(paymentObject, ctpCart)
      paymentObject.custom.fields.makePaymentRequest = JSON.stringify(
        makePaymentLinkRequestObj
      );
    }
  }

  const { request, response } = await getPaymentLink(
    adyenMerchantAccount,
    commercetoolsProjectKey,
    makePaymentLinkRequestObj
  )
  const actions = [
    pU.createAddInterfaceInteractionAction({
      request,
      response,
      type: c.CTP_INTERACTION_TYPE_MAKE_PAYMENT_LINK,
    }),
    pU.createSetCustomFieldAction(
      c.CTP_CUSTOM_FIELD_MAKE_PAYMENT_LINK_RESPONSE,
      response
    ),
  ]

  const paymentMethod = request.paymentMethod?.type
  if (paymentMethod) {
    actions.push(pU.createSetMethodInfoMethodAction(paymentMethod))
    const action = pU.createSetMethodInfoNameAction(paymentMethod)
    if (action) actions.push(action)
  }

  const paymentKey = paymentObject.key
  // ensure the key is a string, otherwise the error with "code": "InvalidJsonInput" will return by commercetools API.
  const reference = request.reference.toString()
  // ensure the key and new reference is different, otherwise the error with
  // "code": "InvalidOperation", "message": "'key' has no changes." will return by commercetools API.
  if (reference !== paymentKey)
    actions.push({
      action: 'setKey',
      key: reference,
    })

  const addTransactionAction = pU.createAddTransactionActionByResponse(
    paymentObject.amountPlanned.centAmount,
    paymentObject.amountPlanned.currencyCode,
    response
  )

  if (addTransactionAction) actions.push(addTransactionAction)

  return {
    actions,
  }
}

async function _fetchMatchingCart(paymentObject, ctpProjectKey) {
  const ctpConfig = config.getCtpConfig(ctpProjectKey)
  const ctpClient = ctpClientBuilder.get(ctpConfig)
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
