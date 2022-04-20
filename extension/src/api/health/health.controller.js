import httpUtils from '../../utils.js'

function processRequest(request, response) {
  httpUtils.sendResponse({ response, statusCode: 200 })
}

export default { processRequest }
