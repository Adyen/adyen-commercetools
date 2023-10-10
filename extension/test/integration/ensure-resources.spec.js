import { expect } from 'chai'
import ctpClientBuilder from '../../src/ctp.js'
import config from '../../src/config/config.js'
import { ensureResources } from '../../src/config/init/ensure-resources.js'
import utils from '../../src/utils.js'

describe('::ensure-resources::', () => {
  const [commercetoolsProjectKey] = config.getAllCtpProjectKeys()
  let ctpClient

  beforeEach(async () => {
    const ctpConfig = config.getCtpConfig(commercetoolsProjectKey)
    ctpClient = await ctpClientBuilder.get(ctpConfig)
  })

  it('should ensure types', async () => {
    const apiExtensionTemplate = await utils.readAndParseJsonFile(
      'resources/api-extension.json',
    )
    const {
      body: {
        destination: { url },
      },
    } = await ctpClient.fetchByKey(
      ctpClient.builder.extensions,
      apiExtensionTemplate.key,
    )

    // create resources
    await ensureResources(ctpClient, commercetoolsProjectKey, url)

    // update some fields to ensure sync is working as expected
    await updateTypes()

    // sync
    await ensureResources(ctpClient, commercetoolsProjectKey, url)

    // ensure sync is working as expected
    await ensureSynced()
  })

  async function updateTypes() {
    const { existingPaymentType, existingInterfaceType } = await fetchTypes()

    await Promise.all([
      ctpClient.update(
        ctpClient.builder.types,
        existingPaymentType.id,
        existingPaymentType.version,
        [
          {
            action: 'removeFieldDefinition',
            fieldName: 'commercetoolsProjectKey',
          },
          {
            action: 'removeFieldDefinition',
            fieldName: 'adyenMerchantAccount',
          },
          {
            action: 'addFieldDefinition',
            fieldDefinition: {
              name: 'customFieldOfUser',
              label: {
                en: 'customFieldOfUser',
              },
              type: {
                name: 'String',
              },
              inputHint: 'SingleLine',
              required: false,
            },
          },
        ],
      ),
      ctpClient.update(
        ctpClient.builder.types,
        existingInterfaceType.id,
        existingInterfaceType.version,
        [
          {
            action: 'removeFieldDefinition',
            fieldName: 'type',
          },
          {
            action: 'addFieldDefinition',
            fieldDefinition: {
              name: 'customFieldOfUser',
              label: {
                en: 'customFieldOfUser',
              },
              type: {
                name: 'String',
              },
              inputHint: 'SingleLine',
              required: false,
            },
          },
        ],
      ),
    ])
  }

  async function fetchTypes() {
    const interfaceInteractionType = await utils.readAndParseJsonFile(
      'resources/payment-interface-interaction-type.json',
    )
    const paymentCustomType = await utils.readAndParseJsonFile(
      'resources/web-components-payment-type.json',
    )
    const {
      body: { results },
    } = await ctpClient.fetch(
      ctpClient.builder.types.where(
        `key in ("${paymentCustomType.key}", "${interfaceInteractionType.key}")`,
      ),
    )

    expect(results).to.have.lengthOf(2)

    const existingPaymentType = results.filter(
      (type) => type.key === paymentCustomType.key,
    )[0]
    const existingInterfaceType = results.filter(
      (type) => type.key === interfaceInteractionType.key,
    )[0]

    return { existingPaymentType, existingInterfaceType }
  }

  async function ensureSynced() {
    const { existingPaymentType, existingInterfaceType } = await fetchTypes()

    expect(
      existingPaymentType.fieldDefinitions.map((def) => def.name),
    ).to.include.members(['commercetoolsProjectKey', 'adyenMerchantAccount'])
    expect(
      existingPaymentType.fieldDefinitions.map((def) => def.name),
    ).to.not.have.members(['customFieldOfUser'])

    expect(
      existingInterfaceType.fieldDefinitions.map((def) => def.name),
    ).to.include.members(['type'])
    expect(
      existingInterfaceType.fieldDefinitions.map((def) => def.name),
    ).to.not.have.members(['customFieldOfUser'])
  }
})
