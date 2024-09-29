const { generateSampleCsv } = require('./sampleCsv')
const { initializeDatabase } = require('./database')
const {
  initPrecinctsGroupingsTables,
  getTargetPrecincts,
} = require('./precincts')
const { getPrecinctDistricts, getTargetDistricts } = require('./districts')
const {
  importCandidatesCsv,
  importDistrictsCsv,
  importVotersCsv,
} = require('./importData')
const { generateTextMessages, exportMessagesCsv } = require('./messages')
const path = require('path')

function showHelp() {
  console.log(`
  Usage: node index.js [command] [options]

  Commands:
    generate-sample      Generate a sample CSV file.
    init-db [dbfile]     Initialize the database (optional dbfile parameter).
    import-districts     Import precinct districts CSV.
    import-candidates    Import candidate endorsements CSV.
    import-voters        Import voters CSV.
    precinct-districts <precinct>   Get districts a precinct is a part of.
    target-districts     Get target districts (based on candidates table).
    target-precincts     Get the precincts to be targeted.
    generate-groupings   Generate the target_precincts and target_groupings tables.
    generate-messages    Generate text messages.
    export-messages-csv [OUTPUT DIR]   Export the generated text messages and recipients info to CSV files.
    
  Options:
    --help               Show this help message.
  `)
}

async function handleCommand(args) {
  const command = args[2]

  switch (command) {
    case 'generate-sample':
      const inputCsv = path.join(__dirname, '../data/voter_registration.csv')
      const outputCsv = path.join(__dirname, '../data/output_sample.csv')
      const numRows = args[3] ? parseInt(args[3]) : 10
      await generateSampleCsv(inputCsv, outputCsv, numRows)
      break

    case 'init-db':
      const dbFile = args[3] || null // Optional parameter for db file name
      await initializeDatabase(dbFile)
      break

    case 'import-candidates':
      await importCandidatesCsv()
      break

    case 'import-districts':
      await importDistrictsCsv()
      break

    case 'import-voters':
      await importVotersCsv()
      break

    case 'precinct-districts':
      const precinct = args[3] || null
      if (!precinct) {
        showHelp()
        break
      }
      const pdists = await getPrecinctDistricts(precinct)
      console.log(pdists)
      break

    case 'target-districts':
      const tdists = await getTargetDistricts()
      console.log(tdists)
      break

    case 'target-precincts':
      const precincts = await getTargetPrecincts()
      console.log(precincts)
      break

    case 'generate-groupings':
      await initPrecinctsGroupingsTables()
      break

    case 'generate-messages':
      const batchId = args[3] || null
      await generateTextMessages(batchId)
      break

    case 'export-messages-csv':
      const exportCsvDir = args[3] || null
      await exportMessagesCsv(exportCsvDir)
      break

    case '--help':
    default:
      showHelp()
      break
  }
}

module.exports = handleCommand
