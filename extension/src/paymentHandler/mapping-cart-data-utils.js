import ctpClientBuilder from '../ctp.js'
import config from '../config/config.js'
import lineItemsUtils from './line-items-utils.js'

async function getDataFromCart(requestObj, paymentObject, ctpProjectKey) {
    const ctpConfig = config.getCtpConfig(ctpProjectKey);
    const ctpClient = await ctpClientBuilder.get(ctpConfig);
    const ctpCart = await fetchMatchingCart(paymentObject, ctpClient);
    if (ctpCart) {
        requestObj = _mapCartData(requestObj, paymentObject, ctpCart);

        if (ctpCart.customerId) {
            const customer = await fetchMatchingCustomer(ctpClient, ctpCart);
            if (customer) {
                requestObj = _mapCustomerData(requestObj, customer);
            }
        }
    }

    return requestObj
}

async function fetchMatchingCart(paymentObject, ctpClient) {
    const {body} = await ctpClient.fetch(
        ctpClient.builder.carts
            .where(`paymentInfo(payments(id="${paymentObject.id}"))`)
            .expand('shippingInfo.shippingMethod'),
    );

    return body.results[0];
}

async function fetchMatchingCustomer(ctpClient, ctpCart) {
    const {body} = await ctpClient.fetch(
        ctpClient.builder.customers
            .where(`id="${ctpCart.customerId}"`)
    );

    return body.results[0];
}

function _mapCartData(requestObj, paymentObject, ctpCart) {
    requestObj = _mapBillingAddress(requestObj, ctpCart);
    requestObj.countryCode = requestObj.countryCode ?? ctpCart.country;
    requestObj.shopperEmail = requestObj.shopperEmail ?? ctpCart.customerEmail;
    requestObj.shopperLocale = requestObj.shopperLocale ?? ctpCart.locale;
    requestObj.lineItems = requestObj.lineItems ?? lineItemsUtils.createLineItems(
        paymentObject,
        ctpCart,
    );

    if (requestObj.paymentMethod && requestObj.paymentMethod.type === 'scheme') {
        requestObj = _mapAdditionalData(requestObj, ctpCart);
    }

    return requestObj;
}

function _mapBillingAddress(requestObj, ctpCart) {
    requestObj.billingAddress = requestObj.billingAddress ?? {};
    requestObj.billingAddress.street = requestObj.billingAddress.street ?? ctpCart.billingAddress.streetName;
    requestObj.billingAddress.houseNumberOrName =
        requestObj.billingAddress.houseNumberOrName ?? ctpCart.billingAddress.streetNumber;
    requestObj.billingAddress.city = requestObj.billingAddress.city ?? ctpCart.billingAddress.city;
    requestObj.billingAddress.postalCode = requestObj.billingAddress.postalCode ?? ctpCart.billingAddress.postalCode;
    requestObj.billingAddress.country = requestObj.billingAddress.country ?? ctpCart.billingAddress.country;

    return requestObj;
}

function _mapAdditionalData(requestObj, ctpCart) {
    requestObj.additionalData = requestObj.additionalData ?? {};
    const enhancedSchemeData = requestObj.additionalData.enhancedSchemeData ?? {};

    enhancedSchemeData.customerReference = enhancedSchemeData.customerReference ?? ctpCart.customerId;
    enhancedSchemeData.destinationCountryCode =
        enhancedSchemeData.destinationCountryCode ?? ctpCart.shippingAddress.country;
    enhancedSchemeData.destinationPostalCode =
        enhancedSchemeData.destinationPostalCode ?? ctpCart.shippingAddress.postalCode;
    enhancedSchemeData.orderDate = _formatDate();
    enhancedSchemeData.totalTaxAmount =
        enhancedSchemeData.totalTaxAmount ?? ctpCart.taxedPrice.totalTax.centAmount;

    if (!enhancedSchemeData.freightAmount && ctpCart.shippingInfo) {
        enhancedSchemeData.freightAmount = ctpCart.shippingInfo.taxRate ?
            ctpCart.shippingInfo.taxedPrice.totalGross.centAmount : ctpCart.shippingInfo.price.value.centAmount;
    }

    if (!enhancedSchemeData.itemDetailLine) {
        enhancedSchemeData.itemDetailLine = {};
        const lineItemsFromCart = ctpCart.lineItems;
        for (let i = 0; i < lineItemsFromCart.length; i++) {
            const lineItemDetails = {};
            lineItemDetails.quantity = lineItemsFromCart[i].quantity;
            lineItemDetails.unitPrice = lineItemsFromCart[i].price.value.centAmount;
            lineItemDetails.totalAmount = lineItemsFromCart[i].taxRate ?
                lineItemsFromCart[i].taxedPrice.totalGross.centAmount : lineItemsFromCart[i].price.value.centAmount;

            enhancedSchemeData.itemDetailLine[`itemDetailLine[${i}]`] = lineItemDetails;
        }
    }

    requestObj.additionalData.enhancedSchemeData = enhancedSchemeData;

    return requestObj;
}

function _formatDate(){
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = String(today.getFullYear()).slice(-2);

    return day + month + year;
}

function _mapCustomerData(requestObj, customer) {
    requestObj.dateOfBirth = requestObj.dateOfBirth ?? customer.dateOfBirth;
    requestObj.shopperName = requestObj.shopperName ?? {};
    requestObj.shopperName.firstName = requestObj.shopperName.firstName ?? customer.firstName;
    requestObj.shopperName.lastName = requestObj.shopperName.lastName ?? customer.lastName;
    requestObj = _mapAccountInfoData(requestObj, customer);

    return requestObj;
}

function _mapAccountInfoData(requestObj, customer) {
    requestObj.accountInfo = requestObj.accountInfo ?? {};
    requestObj.accountInfo.accountCreationDate = requestObj.accountInfo.accountCreationDate ?? customer.createdAt;
    requestObj.accountInfo.accountChangeDate = requestObj.accountInfo.accountChangeDate ?? customer.lastModifiedAt;
    requestObj.accountInfo.accountAgeIndicator = _calculateDateDifference(requestObj.accountInfo.accountCreationDate);
    requestObj.accountInfo.accountChangeIndicator = _calculateDateDifference(requestObj.accountInfo.accountChangeDate);

    return requestObj;
}

function _calculateDateDifference(date){
    const givenDate = new Date(date);
    const now = new Date();

    const millisecondsDiff = now.getTime() - givenDate.getTime()
    const daysDiff = Math.round(
        millisecondsDiff / (1000 * 60 * 60 * 24)
    );

    switch (true) {
        case (daysDiff < 30) :
            return "lessThan30Days";
        case (daysDiff >= 30 && daysDiff <= 60) :
            return  "from30To60Days";
        case (daysDiff > 60) :
            return  "moreThan60Days";
        default:
            return  "notApplicable";
    }
}

export default {fetchMatchingCart, getDataFromCart}
