import rc from 'rc'

function loadConfig() {
  if (process.env.ADYEN_INTEGRATION_CONFIG) {
    return loadFromAdyenIntegrationEnvVar()
  }

  return loadFromExternalFile()
}

function loadFromAdyenIntegrationEnvVar() {
  try {
    return JSON.parse(process.env.ADYEN_INTEGRATION_CONFIG)
  } catch (e) {
    throw new Error(
      'Adyen integration configuration is not provided in the JSON format',
    )
  }
}

function loadFromExternalFile() {
  /*
  see: https://github.com/dominictarr/rc#standards for file precedence.
   */
  const appName = 'notification'
  const configFromExternalFile = rc(appName)
  const hasConfig = configFromExternalFile?.configs?.length > 0
  if (!hasConfig) {
    throw new Error('Adyen integration configuration is not provided.')
  }
  return configFromExternalFile
}

export { loadConfig }
