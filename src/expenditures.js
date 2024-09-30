//const sqlite3 = require('sqlite3')
//const { getDbPath, allAsync, runAsync } = require('./database')
const { getTextMessages } = require('./messages')

async function getCandidatesExpenditures() {
  textMessages = await getTextMessages()
  let candidates = {}
  for (msg of textMessages) {
    //console.log(msg)
    const msgCands = JSON.parse(msg.candidates)
    for (candName in msgCands) {
      if (!candidates[candName]) {
        candidates[candName] = {
          office: msgCands[candName],
          expenditures: {},
          total_expenditures: 0,
        }
      }
      candidates[candName]['expenditures'][msg.grouping_hash] =
        msg.cost_per_candidate
      candidates[candName]['total_expenditures'] += msg.cost_per_candidate
    }
  }
  console.log(candidates)
}

module.exports = {
  getCandidatesExpenditures,
}
