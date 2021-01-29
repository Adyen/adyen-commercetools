const sinon = require('sinon')
const { expect } = require('chai')

const config = require('../../src/config/config')
const notificationController = require('../../src/api/notification/notification.controller.js')
const httpUtils = require('../../src/utils/commons')

const sandbox = sinon.createSandbox()
describe('notification controller', () => {
  let originalCollectRequestDataFn

  before(() => {
    originalCollectRequestDataFn = httpUtils.collectRequestData
  })

  afterEach(() => {
    httpUtils.collectRequestData = originalCollectRequestDataFn
    module.exports = httpUtils
    sandbox.restore()
  })

  it(
    'when request does not contain commercetoolsProjectKey, ' +
      'it should skip processing and return accepted',
    async () => {
      // prepare:
      const requestMock = {
        method: 'POST',
      }
      const responseMock = {
        writeHead: () => {},
        end: () => {},
      }
      const responseWriteHeadSpy = sandbox.spy(responseMock, 'writeHead')
      const responseEndSpy = sandbox.spy(responseMock, 'end')
      httpUtils.collectRequestData = function () {
        return JSON.stringify({
          live: 'false',
          notificationItems: [
            {
              NotificationRequestItem: {
                amount: {
                  currency: 'EUR',
                  value: 10100,
                },
                eventCode: 'AUTHORISATION',
                eventDate: '2019-01-30T18:16:22+01:00',
                merchantAccountCode: 'CommercetoolsGmbHDE775',
                merchantReference: '8313842560770001',
                operations: ['CANCEL', 'CAPTURE', 'REFUND'],
                paymentMethod: 'visa',
                pspReference: 'test_AUTHORISATION_1',
                success: 'true',
              },
            },
          ],
        })
      }
      module.exports = httpUtils

      const configGetCtpConfigSpy = sandbox.spy(config, 'getCtpConfig')
      config.getCtpConfig = configGetCtpConfigSpy
      module.exports = config

      // test:
      await notificationController.handleNotification(requestMock, responseMock)

      // expect:
      expect(responseWriteHeadSpy.firstCall.firstArg).to.equal(200)
      expect(responseEndSpy.firstCall.firstArg).to.equal(
        JSON.stringify({ notificationResponse: '[accepted]' })
      )
      expect(configGetCtpConfigSpy.called).to.be.false
    }
  )
})
