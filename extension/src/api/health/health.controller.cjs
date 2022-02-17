const httpUtils = require('../../utils')

function processRequest(request, response) {
  httpUtils.sendResponse({ response, statusCode: 200 })
}

module.exports = { processRequest }
