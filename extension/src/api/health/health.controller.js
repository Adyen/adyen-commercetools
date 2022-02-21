import httpUtils from '../../utils.cjs'

function processRequest(request, response) {
  httpUtils.sendResponse({ response, statusCode: 200 })
}

export default { processRequest }
