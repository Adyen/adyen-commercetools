const { expect } = require('chai')
const sinon = require('sinon')
const _ = require('lodash')
const { ensureResources } = require('../../../../src/config/init/ensure-resources')

const webComponentsPaymentType = require('../../../../resources/web-components-payment-type.json')
const apiExtension = require('../../../../resources/api-extension.json')
const interfaceInteractionType = require('../../../../resources/payment-interface-interaction-type.json')

describe('Ensure resources', () => {
  const mockClient = {
    get builder () {
      return {
        extensions: {
          where: () => {
          }
        },
        types: {
          where: () => {
          }
        }
      }
    },
    fetch () {
    },
    create () {
    }
  }

  afterEach(() => {
    sinon.restore()
  })

  it('should ensure payment type, interface interaction and api extension are created', async () => {
    sinon.stub(mockClient, 'fetch').returns({ body: { results: [] } })
    const createStub = sinon.stub(mockClient, 'create').returns({ body: { results: [] } })

    await ensureResources(mockClient)

    expect(createStub.callCount).to.equal(3)

    const callArgs = _.flattenDeep(createStub.args)
    const createdPaymentType = callArgs.find(arg => arg.key === webComponentsPaymentType.key)
    expect(createdPaymentType).to.deep.equal(webComponentsPaymentType)

    const createdApiExtension = callArgs.find(arg => arg.key === apiExtension.key)
    // set the url variable in the template to the correctly evaluated value
    const apiExtensionCloned = _.cloneDeep(apiExtension)
    apiExtensionCloned.destination.url = ''
    expect(createdApiExtension).to.deep.equal(apiExtensionCloned)

    const createdInterfaceInteractionType = callArgs.find(arg => arg.key === interfaceInteractionType.key)
    expect(createdInterfaceInteractionType).to.deep.equal(interfaceInteractionType)
  })

  it('should not create resources when they already exist', async () => {
    sinon.stub(mockClient, 'fetch').returns({ body: { results: [{ id: 'testId' }] } })
    const createStub = sinon.stub(mockClient, 'create').returns({ body: { results: [] } })

    await ensureResources(mockClient)

    expect(createStub.callCount).to.equal(0)
  })
})
