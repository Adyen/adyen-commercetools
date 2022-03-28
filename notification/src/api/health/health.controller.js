import httpUtils from '../../utils/commons'

function processRequest(request, response) {
  httpUtils.sendResponse(response, 200)
}

export { processRequest }
