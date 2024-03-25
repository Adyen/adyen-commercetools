import ctpClientBuilder from '../ctp.js'
import config from '../config/config.js'
import lineItemsUtils from './line-items-utils.js'

async function getDataFromCart(requestObj, paymentObject, ctpProjectKey) {
    const ctpCart = await fetchMatchingCart(paymentObject, ctpProjectKey);

    if (ctpCart) {
        requestObj.countryCode = requestObj.countryCode ?? ctpCart.country;
        requestObj.lineItems = requestObj.lineItems ?? lineItemsUtils.createLineItems(
            paymentObject,
            ctpCart,
        );

        if (ctpCart.customerId) {
            const customer = await fetchMatchingCustomer(
                ctpProjectKey,
                ctpCart
            )

            if (customer) {
                requestObj.dateOfBirth = requestObj.dateOfBirth ?? customer.dateOfBirth;
            }
        }
    }

    return requestObj
}

async function fetchMatchingCart(paymentObject, ctpProjectKey) {
    const ctpConfig = config.getCtpConfig(ctpProjectKey)
    const ctpClient = await ctpClientBuilder.get(ctpConfig)
    const {body} = await ctpClient.fetch(
        ctpClient.builder.carts
            .where(`paymentInfo(payments(id="${paymentObject.id}"))`)
            .expand('shippingInfo.shippingMethod'),
    )
    return body.results[0]
}

async function fetchMatchingCustomer(ctpProjectKey, ctpCart) {
    const ctpConfig = config.getCtpConfig(ctpProjectKey)
    const ctpClient = await ctpClientBuilder.get(ctpConfig)
    const {body} = await ctpClient.fetch(
        ctpClient.builder.customers
            .where(`id="${ctpCart.customerId}"`)
    )
    return body.results[0]
}

export default { fetchMatchingCart, getDataFromCart }
