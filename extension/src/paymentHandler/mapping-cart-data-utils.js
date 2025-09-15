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
    ctpClient.builder.carts.where(
      `paymentInfo(payments(id="${paymentObject.id}"))`,
    ),
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
    requestObj = _mapAdditionalData(requestObj, ctpCart)
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
  deliveryAddress.country =
    deliveryAddress.country ?? ctpCart.shippingAddress?.country

  requestObj.deliveryAddress = deliveryAddress
  requestObj.telephoneNumber =
    requestObj.telephoneNumber ?? ctpCart.shippingAddress?.phone ?? ''

  return requestObj
}

function _mapAdditionalData(requestObj, ctpCart) {
  requestObj.additionalData = requestObj.additionalData ?? {}
  let enhancedSchemeData = requestObj.additionalData.enhancedSchemeData ?? {}

  enhancedSchemeData.customerReference =
    enhancedSchemeData.customerReference ?? ctpCart.customerId
  enhancedSchemeData.destinationCountryCode =
    enhancedSchemeData.destinationCountryCode ??
    ctpCart.shippingAddress?.country
  enhancedSchemeData.destinationPostalCode =
    enhancedSchemeData.destinationPostalCode ??
    ctpCart.shippingAddress?.postalCode
  enhancedSchemeData.orderDate = _formatDate()
  enhancedSchemeData.totalTaxAmount =
    enhancedSchemeData.totalTaxAmount ?? ctpCart.taxedPrice?.totalTax.centAmount

  if (!enhancedSchemeData.freightAmount && ctpCart.shippingInfo) {
    enhancedSchemeData.freightAmount = ctpCart.shippingInfo.taxRate
      ? ctpCart.shippingInfo.taxedPrice.totalGross.centAmount
      : ctpCart.shippingInfo.price.value.centAmount
  }

  if (!enhancedSchemeData.itemDetailLine) {
    enhancedSchemeData = _mapItemDetailLines(enhancedSchemeData, ctpCart)
  }

  requestObj.additionalData.enhancedSchemeData = enhancedSchemeData

  return requestObj
}

function _formatDate() {
  const today = new Date()
  const day = today.getDate().toString().padStart(2, '0')
  const month = (today.getMonth() + 1).toString().padStart(2, '0')
  const year = today.getFullYear().toString().slice(-2)

  return day + month + year
}

function _mapItemDetailLines(enhancedSchemeData, ctpCart) {
  enhancedSchemeData.itemDetailLine = {}
  let i = 0

  ctpCart.lineItems?.forEach((item) => {
    const lineItemDetails = {}
    lineItemDetails.quantity = item.quantity
    lineItemDetails.totalAmount = item.totalPrice?.centAmount
    lineItemDetails.unitPrice = item.taxRate
      ? parseInt(
          (
            item.taxedPrice.totalGross.centAmount / lineItemDetails.quantity
          ).toFixed(0),
          10,
        )
      : item.price.value.centAmount

    enhancedSchemeData.itemDetailLine[`itemDetailLine[${i++}]`] =
      lineItemDetails
  })

  ctpCart.customLineItems?.forEach((item) => {
    const lineItemDetails = {}
    lineItemDetails.quantity = item.quantity
    lineItemDetails.totalAmount = item.totalPrice?.centAmount
    lineItemDetails.unitPrice = item.taxRate
      ? parseInt(
          (
            item.taxedPrice.totalGross.centAmount / lineItemDetails.quantity
          ).toFixed(0),
          10,
        )
      : item.money.centAmount

    enhancedSchemeData.itemDetailLine[`itemDetailLine[${i++}]`] =
      lineItemDetails
  })

  return enhancedSchemeData
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

export default { getDataFromCart }
