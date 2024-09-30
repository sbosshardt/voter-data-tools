const crypto = require('crypto')
const path = require('path')
const { loadConfig } = require('./config')

const fs = require('fs')

// Helper function to capitalize the first letter and make the rest lowercase
function capitalizeName(name) {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

// Helper function to escape CSV fields properly
function escapeCsvField(field) {
  if (field === null) {
    return ''
  }
  if (typeof field === 'number' || field === '') {
    return field
  }
  if (
    field &&
    (field.includes(',') || field.includes('\n') || field.includes('"'))
  ) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

function getHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex')
}

function getGroupingHash(data) {
  const fullHash = getHash(data)
  const shortHash = fullHash.substring(0, 4).toUpperCase()
  return shortHash
}

async function getConfigValue(var_name, default_value = null) {
  // Load the configuration
  const config = await loadConfig().catch((err) => {
    console.error('Error in loadConfig:', err)
    return
  })

  if (!config) {
    console.error('Unable to load config.')
    return
  }

  return config[var_name] || default_value
}

// Helper function to get SQL conditions for filtering voters.
async function getCostPerRecipient() {
  const cost = await getConfigValue('costPerRecipient')
  return cost || 0
}

async function getCsvOutputDir(outputCsvDir = null) {
  const config = await loadConfig()
  const exportFile =
    (outputCsvDir || config.textMessagesDefaultExportDir || 'data/export') +
    '/text_messages.csv'

  // Ensure the output directory exists
  const outputDir = path.dirname(exportFile)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  return outputDir
}

module.exports = {
  capitalizeName,
  escapeCsvField,
  getConfigValue,
  getCostPerRecipient,
  getCsvOutputDir,
  getGroupingHash,
  getHash,
}
