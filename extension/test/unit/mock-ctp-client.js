/*eslint-disable*/
function setUpClient () {
  const mockClient = {
    get builder () {
    },

    async fetchBatches (uri, callback, opts = { accumulate: false }) {
    },

    async fetch (uri) {
      return { body: { results: [] } }
    },

    async create (uri, body) {
      return {}
    },

    async delete (uri, id, version) {
      return {}
    }
  }
}


module.exports = {
  get: () => setUpClient()
}
