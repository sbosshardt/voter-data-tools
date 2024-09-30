const crypto = require('crypto')
const { loadConfig } = require('./config')

// Helper function to capitalize the first letter and make the rest lowercase
function capitalizeName(name) {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

// Helper function to escape CSV fields properly
function escapeCsvField(field) {
  if (typeof field === 'number') {
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

// Helper function to get SQL conditions for filtering voters.
async function getCostPerRecipient() {
  // Load the configuration
  const config = await loadConfig().catch((err) => {
    console.error('Error in loadConfig:', err)
    return
  })

  if (!config) {
    console.error('Unable to load config.')
    return
  }

  return config.costPerRecipient || 0
}

module.exports = {
  capitalizeName,
  escapeCsvField,
  getGroupingHash,
  getHash,
}
