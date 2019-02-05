const httpUtils = require('../../utils')
const ctpClient = require('../../ctp/ctp').get()
const _ = require('lodash')

async function handleNotification (request, response) {
  const body = await httpUtils.collectRequestData(request, response)
  await getPaymentIdByPspReference('test_AUTHORISATION_4')
  response.setHeader('boo', 'boo')
  response.statusCode = 200
  console.log(body.join())
  return response.end(body.join() || 'qqq')
}

async function getPaymentIdByPspReference (pspReference) {
  const payments = await ctpClient.fetch(ctpClient.builder.payments.where(`interfaceId="${pspReference}"`))
  return _.get(payments, 'body.results[0].id', null)
}

module.exports = { handleNotification }
