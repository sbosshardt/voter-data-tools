const generateSampleCsv = require('./generateSampleCsv')
const initializeDatabase = require('./database')
const { initPrecinctsGroupingsTables } = require('./precinctGroupings')
const {
  importCandidatesCsv,
  importDistrictsCsv,
  importVotersCsv,
} = require('./importData')
const {
  getPrecinctDistricts,
  getTargetDistricts,
  getTargetPrecincts,
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
    init-precinct-groupings   Initialize the precincts and groupings tables.
    import-districts     Import precinct districts CSV.
    import-candidates    Import candidate endorsements CSV.
    import-voters        Import voters CSV.
    precinct-districts <precinct>   Get districts a precinct is a part of.
    target-districts     Get target districts (based on candidates table).
    target-precincts     Generate the precincts to be targeted.
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

    case 'init-precinct-groupings':
      await initPrecinctsGroupingsTables()
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
