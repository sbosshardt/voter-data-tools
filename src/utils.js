const crypto = require('crypto')

// Helper function to capitalize the first letter and make the rest lowercase
function capitalizeName(name) {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

// Helper function to escape CSV fields properly
function escapeCsvField(field) {
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
  const shortHash = fullHash.substring(0, 6)
  return shortHash
}

module.exports = {
  capitalizeName,
  escapeCsvField,
  getGroupingHash,
  getHash,
}
