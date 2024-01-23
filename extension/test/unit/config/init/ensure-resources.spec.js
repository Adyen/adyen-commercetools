import { expect } from 'chai'
import sinon from 'sinon'
import _ from 'lodash'
import { ensureResources } from '../../../../src/config/init/ensure-resources.js'
import utils from '../../../../src/utils.js'

describe('Ensure resources', () => {
  let webComponentsPaymentType
  let apiExtension
  let interfaceInteractionType
  const mockClient = {
    get builder() {
      return {
        extensions: {
          where: () => {},
        },
        types: {
          where: () => {},
        },
      }
    },
    fetchByKey() {},
    create() {},
  }

  before(async () => {
    webComponentsPaymentType = await utils.readAndParseJsonFile(
      'resources/web-components-payment-type.json',
    )
    apiExtension = await utils.readAndParseJsonFile(
      'resources/api-extension.json',
    )
    interfaceInteractionType = await utils.readAndParseJsonFile(
      'resources/payment-interface-interaction-type.json',
    )
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should ensure payment type, interface interaction type and API extension are created', async () => {
    sinon.stub(mockClient, 'fetchByKey').throws({ statusCode: 404 })
    const createStub = sinon
      .stub(mockClient, 'create')
      .returns({ body: { results: [] } })

    await ensureResources(mockClient)

    expect(createStub.callCount).to.equal(4)

    const callArgs = _.flattenDeep(createStub.args)
    const createdPaymentType = callArgs.find(
      (arg) => arg.key === webComponentsPaymentType.key,
    )
    expect(createdPaymentType).to.deep.equal(webComponentsPaymentType)

    const createdApiExtension = callArgs.find(
      (arg) => arg.key === apiExtension.key,
    )
    // set the url variable in the template to the correctly evaluated value
    const apiExtensionCloned = _.cloneDeep(apiExtension)
    apiExtensionCloned.destination.url = ''
    expect(createdApiExtension).to.deep.equal(apiExtensionCloned)

    const createdInterfaceInteractionType = callArgs.find(
      (arg) => arg.key === interfaceInteractionType.key,
    )
    expect(createdInterfaceInteractionType).to.deep.equal(
      interfaceInteractionType,
    )
  })

  it('should fail when there is error on resource creation', async () => {
    sinon.stub(mockClient, 'fetchByKey').throws({ statusCode: 404 })
    sinon.stub(mockClient, 'create').throws('test error')

    try {
      await ensureResources(mockClient)
    } catch (e) {
      expect(e.message).to.contain('test error')
      return
    }
    throw new Error('ensureResources should throw an error but did not')
  })

  it('should fail when there is error on resource fetching', async () => {
    sinon.stub(mockClient, 'fetchByKey').throws({ statusCode: 500 })

    try {
      await ensureResources(mockClient)
    } catch (e) {
      expect(e.message).to.contain('500')
      return
    }
    throw new Error('ensureResources should throw an error but did not')
  })
})
