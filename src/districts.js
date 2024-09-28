const sqlite3 = require('sqlite3')
const { getDbPath } = require('./database')

async function getPrecinctDistricts(precinct) {
  const dbPath = await getDbPath()

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message)
        return reject(err)
      }
    })

    const query = `
      SELECT DISTINCT district
      FROM districts
      WHERE precinct = ?
      ORDER BY district ASC
    `

    db.all(query, [precinct], (err, rows) => {
      if (err) {
        console.error('Error querying database:', err.message)
        reject(err)
      } else {
        const districts = rows.map((row) => row.district) // Extract districts into an array
        resolve(districts)
      }
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message)
        }
      })
    })
  })
}

async function getTargetDistricts(includeNonTriggers = false) {
  const dbPath = await getDbPath()

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message)
        return reject(err)
      }
    })

    const trig_sql_condition = includeNonTriggers
      ? ''
      : 'AND triggers_precinct = 1'
    // Define the query to get the distinct districts
    const query = `
      SELECT DISTINCT district
      FROM candidates
      WHERE unopposed = 0
      ${trig_sql_condition}
      ORDER BY district ASC
    `

    // Execute the query and collect results
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Error querying database:', err.message)
        reject(err)
      } else {
        const districts = rows.map((row) => row.district) // Extract districts into an array
        resolve(districts)
      }
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message)
        }
      })
    })
  })
}

module.exports = {
  getPrecinctDistricts,
  getTargetDistricts,
}
