import httpUtils from '../../utils.mjs'

function processRequest(request, response) {
  httpUtils.sendResponse({ response, statusCode: 200 })
}

export default { processRequest }
