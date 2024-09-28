const crypto = require('crypto')

function getHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex')
}

function getGroupingHash(data) {
  const fullHash = getHash(data)
  const shortHash = fullHash.substring(0, 6)
  return shortHash
}

module.exports = {
  getGroupingHash,
  getHash,
}
