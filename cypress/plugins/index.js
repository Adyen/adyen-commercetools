// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

const creditCard3ds = require('../../cypress/setUp/credit_card_3d_redirect.js')
const ngrok = require('../../cypress/setUp/ngrok.js')
const paymentResources = require('../../cypress/setUp/payment_resources.js')

module.exports = async (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config

  process.env.CTP_PROJECT_KEY = config.env.CTP_PROJECT_KEY
  process.env.CTP_CLIENT_ID = config.env.CTP_CLIENT_ID
  process.env.CTP_CLIENT_SECRET = config.env.CTP_CLIENT_SECRET
  process.env.ADYEN_API_KEY = config.env.ADYEN_API_KEY
  process.env.ADYEN_MERCHANT_ACCOUNT = config.env.ADYEN_MERCHANT_ACCOUNT
  process.env.CLIENT_ENCRYPTION_PUBLIC_KEY = config.env.CLIENT_ENCRYPTION_PUBLIC_KEY

  on('task', {
    createCreditCard3DS: ngrokUrl => creditCard3ds.init(ngrokUrl),
    ngrokInit: async (port) => {
      await ngrok.init(port)
      return null
    },
    ngrokDestroy: async () => {
      await ngrok.destroy()
      return null
    },
    paymentResources: async () => {
      await paymentResources.init()
      return null
    }
  })

  return config
}
