const fs = require('fs/promises')
const path = require('path')

// Helper function to deep merge two objects (config.json overrides config-defaults.json)
function deepMerge(defaultConfig, userConfig) {
  for (const key in userConfig) {
    if (
      userConfig[key] &&
      typeof userConfig[key] === 'object' &&
      !Array.isArray(userConfig[key])
    ) {
      defaultConfig[key] = deepMerge(defaultConfig[key] || {}, userConfig[key])
    } else {
      defaultConfig[key] = userConfig[key]
    }
  }
  return defaultConfig
}

async function loadConfigFiles(defaultConfigPath, userConfigPath) {
  try {
    const defaultConfig = JSON.parse(
      await fs.readFile(defaultConfigPath, 'utf-8'),
    )

    // Check if config.json exists; if not, create it as a copy of config-defaults.json
    try {
      await fs.access(userConfigPath)
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log(`Creating user config file: ${userConfigPath}`)
        await fs.copyFile(defaultConfigPath, userConfigPath)
      }
    }

    const userConfig = JSON.parse(await fs.readFile(userConfigPath, 'utf-8'))

    if (defaultConfig?.cfgVersion !== userConfig?.cfgVersion) {
      console.log('Version mismatch for defaultConfig and userConfig!')
      console.log(
        'Please either delete your data/config.json file or update its structure and cfgVersion to be compatible with data/config-defaults.json.',
      )
      return null
    }

    // Merge user config into default config (user config takes precedence)
    const finalConfig = deepMerge(defaultConfig, userConfig)

    return finalConfig
  } catch (err) {
    console.error('Error loading configuration:', err)
    return null
  }
}

async function loadConfig() {
  const defaultConfigPath = path.resolve('data/config-defaults.json')
  const userConfigPath = path.resolve('data/config.json')

  const config = await loadConfigFiles(defaultConfigPath, userConfigPath)
  //console.log(config)

  // You can now use the loaded config
  return config
}

module.exports = {
  loadConfig,
}
