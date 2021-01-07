const httpUtils = require('../../utils/commons')

function processRequest(request, response) {
  httpUtils.sendResponse({response})
}

module.exports = { processRequest }
