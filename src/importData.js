const path = require('path')
const loadConfig = require('./loadConfig')

async function importPrecinctDistrictsCsv() {
  console.log(
    'Precinct Districts CSV import functionality is under construction.',
  )
}

async function importVotersCsv() {
  console.log('Voters CSV import functionality is under construction.')
  config = await loadConfig().catch((err) =>
    console.error('Error in loadConfig:', err),
  )
  console.log('Loaded configuration: ', JSON.stringify(config, null, 2))
  const votersMapping = config.csvMappings.voters.columns
  console.log('Voters mappings:', votersMapping)
}

async function importConfigCsv() {
  console.log('Configuration CSV import functionality is under construction.')
}

module.exports = {
  importPrecinctDistrictsCsv,
  importVotersCsv,
  importConfigCsv,
}
