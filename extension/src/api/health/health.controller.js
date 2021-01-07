const { utils } = require('commercetools-adyen-integration-commons')

function processRequest(request, response) {
  utils.sendResponse({ response, statusCode: 200 })
}

module.exports = { processRequest }
