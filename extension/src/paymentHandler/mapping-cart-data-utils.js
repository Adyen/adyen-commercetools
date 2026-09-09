import ctpClientBuilder from '../ctp.js'
import config from '../config/config.js'
import lineItemsUtils from './line-items-utils.js'

async function getDataFromCart(requestObj, paymentObject, ctpProjectKey) {
  const ctpConfig = config.getCtpConfig(ctpProjectKey)
  const ctpClient = await ctpClientBuilder.get(ctpConfig)
  const ctpCart = await fetchMatchingCart(paymentObject, ctpClient)
  if (ctpCart) {
    requestObj = _mapCartData(requestObj, paymentObject, ctpCart)

    if (ctpCart.customerId) {
      const customer = await fetchMatchingCustomer(ctpClient, ctpCart)
      if (customer) {
        requestObj = _mapCustomerData(requestObj, customer)
      }
    }
  }

  return requestObj
}

async function fetchMatchingCart(paymentObject, ctpClient) {
  const { body } = await ctpClient.fetch(
    ctpClient.builder.carts
      .where(`paymentInfo(payments(id="${paymentObject.id}"))`)
      .expand('lineItems[*].supplyChannel')
      .expand('shippingInfo'),
  )

  return body.results[0]
}

async function fetchMatchingCustomer(ctpClient, ctpCart) {
  const { body } = await ctpClient.fetch(
    ctpClient.builder.customers.where(`id="${ctpCart.customerId}"`),
  )

  return body.results[0]
}

function _mapCartData(requestObj, paymentObject, ctpCart) {
  requestObj = _mapBillingAddress(requestObj, ctpCart)
  requestObj = _mapShippingAddress(requestObj, ctpCart)

  requestObj.countryCode = requestObj.countryCode ?? ctpCart.country
  requestObj.shopperEmail = requestObj.shopperEmail ?? ctpCart.customerEmail
  requestObj.shopperLocale = requestObj.shopperLocale ?? ctpCart.locale

  requestObj.lineItems =
    requestObj.lineItems ??
    lineItemsUtils.createLineItems(paymentObject, ctpCart)

  if (requestObj.paymentMethod?.type === 'scheme') {
    requestObj = _mapAdditionalData(
      requestObj,
      ctpCart,
      ctpCart.billingAddress?.country === 'US',
    )
  }

  return requestObj
}

function _mapBillingAddress(requestObj, ctpCart) {
  const billingAddress = requestObj.billingAddress ?? {}

  billingAddress.street =
    billingAddress.street ?? ctpCart.billingAddress?.streetName
  billingAddress.houseNumberOrName =
    billingAddress.houseNumberOrName ?? ctpCart.billingAddress?.streetNumber
  billingAddress.city = billingAddress.city ?? ctpCart.billingAddress?.city
  billingAddress.postalCode =
    billingAddress.postalCode ?? ctpCart.billingAddress?.postalCode
  billingAddress.stateOrProvince =
    billingAddress.stateOrProvince ??
    ctpCart.billingAddress?.state ??
    ctpCart.billingAddress?.region
  billingAddress.country =
    billingAddress.country ?? ctpCart.billingAddress?.country

  requestObj.billingAddress = billingAddress
  requestObj.telephoneNumber =
    requestObj.telephoneNumber ?? ctpCart.billingAddress?.phone

  return requestObj
}

function _mapShippingAddress(requestObj, ctpCart) {
  const deliveryAddress = requestObj.deliveryAddress ?? {}

  deliveryAddress.street =
    deliveryAddress.street ?? ctpCart.shippingAddress?.streetName
  deliveryAddress.houseNumberOrName =
    deliveryAddress.houseNumberOrName ??
    ctpCart.shippingAddress?.streetNumber ??
    ''
  deliveryAddress.city = deliveryAddress.city ?? ctpCart.shippingAddress?.city
  deliveryAddress.postalCode =
    deliveryAddress.postalCode ?? ctpCart.shippingAddress?.postalCode
  deliveryAddress.stateOrProvince =
    deliveryAddress.stateOrProvince ??
    ctpCart.shippingAddress?.state ??
    ctpCart.shippingAddress?.region
  deliveryAddress.country =
    deliveryAddress.country ?? ctpCart.shippingAddress?.country

  requestObj.deliveryAddress = deliveryAddress
  requestObj.telephoneNumber =
    requestObj.telephoneNumber ?? ctpCart.shippingAddress?.phone ?? ''

  return requestObj
}

function _mapAdditionalData(requestObj, ctpCart, isUsDomesticPayment) {
  requestObj.additionalData = requestObj.additionalData ?? {}
  const additionalData = requestObj.additionalData
  const providedAdditionalData =
    structuredClone(requestObj.additionalData) ?? {}
  delete requestObj.additionalData.enhancedSchemeData

  additionalData['enhancedSchemeData.customerReference'] =
    providedAdditionalData.enhancedSchemeData?.customerReference ??
    ctpCart.customerId ??
    ctpCart.customerEmail
  additionalData['enhancedSchemeData.destinationCountryCode'] =
    providedAdditionalData.enhancedSchemeData?.destinationCountryCode ??
    ctpCart.shippingAddress?.country
  additionalData['enhancedSchemeData.destinationPostalCode'] =
    providedAdditionalData.enhancedSchemeData?.destinationPostalCode ??
    ctpCart.shippingAddress?.postalCode
  additionalData['enhancedSchemeData.orderDate'] = _formatDate()
  additionalData['enhancedSchemeData.totalTaxAmount'] =
    providedAdditionalData.enhancedSchemeData?.totalTaxAmount ??
    ctpCart.taxedPrice?.totalTax?.centAmount ??
    0

  if (isUsDomesticPayment) {
    additionalData['enhancedSchemeData.shipFromPostalCode'] =
      providedAdditionalData.enhancedSchemeData?.shipFromPostalCode ??
      ctpCart.lineItems?.[0]?.supplyChannel?.obj?.address?.postalCode
  }

  additionalData['enhancedSchemeData.freightAmount'] =
    providedAdditionalData.enhancedSchemeData?.freightAmount ??
    (ctpCart.shippingInfo?.taxRate
      ? ctpCart.shippingInfo?.taxedPrice?.totalNet.centAmount
      : ctpCart.shippingInfo?.price.centAmount) ??
    0

  requestObj = _mapItemDetailLines(
    requestObj,
    ctpCart,
    isUsDomesticPayment,
    providedAdditionalData,
  )

  return requestObj
}

function _formatDate() {
  const today = new Date()
  const day = today.getDate().toString().padStart(2, '0')
  const month = (today.getMonth() + 1).toString().padStart(2, '0')
  const year = today.getFullYear().toString().slice(-2)

  return day + month + year
}

function _mapItemDetailLines(
  requestObj,
  ctpCart,
  isUsDomesticPayment,
  providedAdditionalData,
) {
  let i = 0
  let additionalData = requestObj.additionalData
  let discountOnTotalCartPrice =
    ctpCart?.discountOnTotalPrice?.discountedNetAmount?.centAmount ?? 0
  let totalSumOfLineItems = _totalSumOfLineItems(ctpCart)

  const providedItemsArray =
    providedAdditionalData?.enhancedSchemeData?.itemDetailLines || []

  ctpCart.lineItems?.forEach((item) => {
    const providedItem = providedItemsArray.find((p) => p.id === item.id) || {}
    const lineNumber = i + 1

    let quantity = providedItem.quantity ?? item.quantity ?? 1
    let [totalAmount, discountAmount] = _getDiscountAmount(
      item,
      item.taxRate
        ? item.taxedPrice.totalNet.centAmount
        : item.price.value.centAmount,
      discountOnTotalCartPrice,
      totalSumOfLineItems,
    )

    totalAmount = providedItem.totalAmount ?? totalAmount ?? 0
    discountAmount = providedItem.discountAmount ?? discountAmount ?? 0

    let unitPrice =
      // eslint-disable-next-line no-constant-binary-expression
      providedItem.unitPrice ?? (totalAmount + discountAmount) / quantity ?? 0

    additionalData[`enhancedSchemeData.itemDetailLine${lineNumber}.quantity`] =
      quantity

    additionalData[`enhancedSchemeData.itemDetailLine${lineNumber}.unitPrice`] =
      unitPrice

    additionalData[
      `enhancedSchemeData.itemDetailLine${lineNumber}.discountAmount`
    ] = discountAmount

    additionalData[
      `enhancedSchemeData.itemDetailLine${lineNumber}.totalAmount`
    ] = totalAmount

    if (isUsDomesticPayment) {
      additionalData[
        `enhancedSchemeData.itemDetailLine${lineNumber}.productCode`
      ] = providedItem.productCode ?? item.productId
      additionalData[
        `enhancedSchemeData.itemDetailLine${lineNumber}.description`
      ] =
        (_isValidDescription(providedItem.description)
          ? providedItem.description
          : null) ?? _getLocalizedString(item.name)
      additionalData[
        `enhancedSchemeData.itemDetailLine${lineNumber}.unitOfMeasure`
      ] = providedItem.unitOfMeasure ?? 'EA'
      additionalData[
        `enhancedSchemeData.itemDetailLine${lineNumber}.commodityCode`
      ] =
        (_isValidCommodityCode(providedItem.commodityCode)
          ? providedItem.commodityCode
          : null) ??
        item.variant?.key ??
        item.productKey ??
        'N/A'
    }

    i++
  })

  ctpCart.customLineItems?.forEach((item) => {
    const providedItem =
      providedItemsArray.find((p) => p.key === item.key) || {}
    const lineNumber = i + 1

    const quantity = providedItem.quantity ?? item.quantity ?? 1
    let [totalAmount, discountAmount] = _getDiscountAmount(
      item,
      item.taxRate
        ? item.taxedPrice.totalNet.centAmount
        : item.money.centAmount,
      discountOnTotalCartPrice,
      totalSumOfLineItems,
    )

    totalAmount = providedItem.totalAmount ?? totalAmount ?? 0
    discountAmount = providedItem.discountAmount ?? discountAmount ?? 0

    const unitPrice =
      // eslint-disable-next-line no-constant-binary-expression
      providedItem.unitPrice ?? (totalAmount + discountAmount) / quantity ?? 0

    additionalData[`enhancedSchemeData.itemDetailLine${lineNumber}.quantity`] =
      quantity

    additionalData[`enhancedSchemeData.itemDetailLine${lineNumber}.unitPrice`] =
      unitPrice

    additionalData[
      `enhancedSchemeData.itemDetailLine${lineNumber}.discountAmount`
    ] = discountAmount

    additionalData[
      `enhancedSchemeData.itemDetailLine${lineNumber}.totalAmount`
    ] = totalAmount
    if (isUsDomesticPayment) {
      additionalData[
        `enhancedSchemeData.itemDetailLine${lineNumber}.productCode`
      ] = providedItem.productCode ?? item.key
      additionalData[
        `enhancedSchemeData.itemDetailLine${lineNumber}.description`
      ] =
        (_isValidDescription(providedItem.description)
          ? providedItem.description
          : null) ?? _getLocalizedString(item.name, isUsDomesticPayment)
      additionalData[
        `enhancedSchemeData.itemDetailLine${lineNumber}.unitOfMeasure`
      ] = providedItem.unitOfMeasure ?? 'EA'
      additionalData[
        `enhancedSchemeData.itemDetailLine${lineNumber}.commodityCode`
      ] =
        (_isValidCommodityCode(providedItem.commodityCode)
          ? providedItem.commodityCode
          : null) ??
        item.key ??
        'N/A'
    }

    i++
  })

  return requestObj
}

function _totalSumOfLineItems(ctpCart) {
  let totalSum = 0

  ctpCart.lineItems?.forEach((item) => {
    totalSum += item.taxRate
      ? item.taxedPrice.totalNet.centAmount
      : item.price.value.centAmount
  })

  ctpCart.customLineItems?.forEach((item) => {
    totalSum += item.taxRate
      ? item.taxedPrice.totalNet.centAmount
      : item.money.centAmount
  })

  return totalSum
}

function _mapCustomerData(requestObj, customer) {
  requestObj.dateOfBirth = requestObj.dateOfBirth ?? customer.dateOfBirth
  requestObj.shopperName = requestObj.shopperName ?? {}
  requestObj.shopperName.firstName =
    requestObj.shopperName.firstName ?? customer.firstName
  requestObj.shopperName.lastName =
    requestObj.shopperName.lastName ?? customer.lastName
  requestObj = _mapAccountInfoData(requestObj, customer)

  return requestObj
}

function _mapAccountInfoData(requestObj, customer) {
  const accountInfo = requestObj.accountInfo ?? {}
  accountInfo.accountCreationDate =
    accountInfo.accountCreationDate ?? customer.createdAt
  accountInfo.accountChangeDate =
    accountInfo.accountChangeDate ?? customer.lastModifiedAt
  accountInfo.accountAgeIndicator = _calculateDateDifference(
    accountInfo.accountCreationDate,
  )
  accountInfo.accountChangeIndicator = _calculateDateDifference(
    accountInfo.accountChangeDate,
  )

  requestObj.accountInfo = accountInfo

  return requestObj
}

function _calculateDateDifference(date) {
  const givenDate = new Date(date)
  const now = new Date()

  const millisecondsDiff = now.getTime() - givenDate.getTime()
  const daysDiff = Math.round(millisecondsDiff / (1000 * 60 * 60 * 24))

  switch (true) {
    case daysDiff < 30:
      return 'lessThan30Days'
    case daysDiff >= 30 && daysDiff <= 60:
      return 'from30To60Days'
    case daysDiff > 60:
      return 'moreThan60Days'
    default:
      return 'notApplicable'
  }
}

function _getLocalizedString(localizedObj, isUsDomesticPayment) {
  if (!localizedObj || typeof localizedObj !== 'object') {
    return ''
  }

  if (isUsDomesticPayment && localizedObj.en) {
    return localizedObj.en
  }

  const values = Object.values(localizedObj)

  return values.length > 0 ? values[0] : ''
}

function _isValidDescription(description) {
  if (!description || typeof description !== 'string') {
    return false
  }

  if (description.length > 26) {
    return false
  }

  const trimmed = description.trim()

  if (trimmed === '') {
    return false
  }

  if (/^0+$/.test(trimmed)) {
    return false
  }

  if (trimmed.length === 1) {
    return false
  }

  return /[a-zA-Z0-9]/.test(trimmed)
}

function _isValidCommodityCode(commodityCode) {
  if (!commodityCode || typeof commodityCode !== 'string') {
    return false
  }

  if (commodityCode.length > 12) {
    return false
  }

  if ([...commodityCode].some((char) => char.charCodeAt(0) > 127)) {
    return false
  }

  if (commodityCode.startsWith(' ') || commodityCode.trim() === '') {
    return false
  }

  return !/^0+$/.test(commodityCode)
}

function _getDiscountAmount(
  lineItem,
  lineItemTotalPrice,
  discountOnTotalPrice,
  totalCartAmount,
) {
  const proportionalDiscount =
    (lineItemTotalPrice / totalCartAmount) * discountOnTotalPrice
  let totalDiscount = Math.round(proportionalDiscount)
  lineItemTotalPrice = lineItemTotalPrice - totalDiscount
  lineItemTotalPrice = lineItemTotalPrice > 0 ? lineItemTotalPrice : 0

  if (
    !lineItem.discountedPricePerQuantity ||
    lineItem.discountedPricePerQuantity.length === 0
  ) {
    return [lineItemTotalPrice, totalDiscount]
  }

  lineItem.discountedPricePerQuantity.forEach((dpq) => {
    if (dpq.discountedPrice?.includedDiscounts) {
      dpq.discountedPrice.includedDiscounts.forEach((discount) => {
        totalDiscount += discount.discountedAmount.centAmount * dpq.quantity
      })
    }
  })

  totalDiscount = totalDiscount > 0 ? totalDiscount : 0

  return [lineItemTotalPrice, totalDiscount]
}

export default { getDataFromCart }
