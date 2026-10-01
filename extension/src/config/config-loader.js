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
      { cause: e },
    )
  }
}

function loadFromExternalFile() {
  /*
  see: https://github.com/dominictarr/rc#standards for file precedence.
   */
  const appName = 'extension'
  const configFromExternalFile = rc(appName)
  const hasConfig = configFromExternalFile?.configs?.length > 0
  if (!hasConfig) {
    throw new Error('Adyen integration configuration is not provided.')
  }
  warnAboutExternalFileConfig(appName, configFromExternalFile.configs)
  return configFromExternalFile
}

/**
 * The `rc` lookup is a wider trust boundary than the env var: it merges every
 * `.extensionrc` found in the working directory, its parents, $HOME and /etc, plus
 * `extension_*` env vars and `--` argv flags. Make it visible in the logs when this
 * path is taken. The bunyan logger cannot be used here because it depends on
 * the loaded config, so a bunyan-compatible JSON line is written directly.
 */
function warnAboutExternalFileConfig(appName, loadedFiles) {
  const warning = {
    name: `ctp-adyen-integration-${appName}`,
    hostname: process.env.HOSTNAME || 'localhost',
    pid: process.pid,
    level: 40,
    msg:
      `ADYEN_INTEGRATION_CONFIG is not set; configuration was loaded from external file(s) ` +
      `[${loadedFiles.join(', ')}] via rc lookup. Prefer the ADYEN_INTEGRATION_CONFIG ` +
      `environment variable, and make sure no untrusted .${appName}rc file or ` +
      `${appName}_* environment variable can reach this process.`,
    time: new Date().toISOString(),
    v: 0,
  }
  console.warn(JSON.stringify(warning))
}

export { loadConfig }
