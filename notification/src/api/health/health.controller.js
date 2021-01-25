const httpUtils = require('../../utils/commons')

function processRequest(request, response) {
  httpUtils.sendResponse(response, 200)
}

module.exports = { processRequest }
