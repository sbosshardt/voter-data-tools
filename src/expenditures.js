const { getCsvOutputDir, escapeCsvField, getConfigValue } = require('./utils')
const fs = require('fs')
const { EOL } = require('os')

async function getCandidatesExpenditures() {
  const { getTextMessages } = require('./messages')
  const textMessages = await getTextMessages()
  let candidates = {}
  for (msg of textMessages) {
    const msgCands = JSON.parse(msg.candidates)
    for (candName in msgCands) {
      if (!candidates[candName]) {
        candidates[candName] = {
          office: msgCands[candName],
          total_expenditures: 0,
          expenditures: {},
        }
      }
      candidates[candName]['expenditures'][msg.grouping_hash] =
        msg.cost_per_candidate
      candidates[candName]['total_expenditures'] += msg.cost_per_candidate
    }
  }
  return candidates
}

async function exportCandidatesExpendituresCsv(outputCsvDir = null) {
  const oDir = await getCsvOutputDir(outputCsvDir)
  const exportFile = oDir + '/candidates_expenditures.csv'
  const cExps = await getCandidatesExpenditures()
  // Prepare the CSV header
  const csvHeader = 'name,office,total_expenditures,expenditures' + EOL
  try {
    // Create the CSV file and write the header
    fs.writeFileSync(exportFile, csvHeader)
    // Loop through the messages and write each row to the CSV file
    for (cName in cExps) {
      const cExp = cExps[cName]
      const total = cExp.total_expenditures.toFixed(2)
      const csvRow =
        [
          escapeCsvField(cName),
          escapeCsvField(cExp.office),
          escapeCsvField(total),
          escapeCsvField(JSON.stringify(cExp.expenditures)),
        ].join(',') + EOL

      // Write the message data to the CSV file
      fs.appendFileSync(exportFile, csvRow)
    }
    console.log(`Candidate expenditures exported successfully to ${exportFile}`)
  } catch (err) {
    console.error('Error exporting candidate expenditures:', err.message)
    console.log(err)
  }
}

module.exports = {
  getCandidatesExpenditures,
  exportCandidatesExpendituresCsv,
}
