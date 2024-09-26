const generateSampleCsv = require('./generateSampleCsv')
const initializeDatabase = require('./database')
const { importDistrictsCsv, importVotersCsv } = require('./importData')
const {
  generatePrecinctGroupings,
  generateTextMessages,
  generateRecipientsLists,
} = require('./generateMessages')
const path = require('path')

function showHelp() {
  console.log(`
  Usage: node index.js [command] [options]

  Commands:
    generate-sample      Generate a sample CSV file.
    init-db [dbfile]     Initialize the database (optional dbfile parameter).
    import-districts     Import precinct districts CSV.
    import-voters        Import voters CSV.
    generate-groupings   Generate precinct groupings.
    generate-messages    Generate text messages.
    generate-recipients  Generate recipients lists.
    
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

    case 'import-districts':
      await importDistrictsCsv()
      break

    case 'import-voters':
      await importVotersCsv()
      break

    case 'generate-groupings':
      await generatePrecinctGroupings()
      break

    case 'generate-messages':
      await generateTextMessages()
      break

    case 'generate-recipients':
      await generateRecipientsLists()
      break

    case '--help':
    default:
      showHelp()
      break
  }
}

module.exports = handleCommand
