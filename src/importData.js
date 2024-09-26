const path = require('path')
const loadConfig = require('./loadConfig')

async function importCsv(table, filePath = null) {
  const config = await loadConfig().catch((err) =>
    console.error('Error in loadConfig:', err),
  )
  console.log('Loaded configuration: ', JSON.stringify(config, null, 2))
  const mappings = config.csvMappings[table].columns
  console.log('Mappings:', mappings)
  const filename = filePath || config.csvMappings[table].csvFilePath
}

async function importPrecinctDistrictsCsv() {
  importCsv('precincts')
}

async function importVotersCsv() {
  importCsv('voters')
}

module.exports = {
  importCsv,
  importPrecinctDistrictsCsv,
  importVotersCsv,
}
