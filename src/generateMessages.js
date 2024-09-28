const sqlite3 = require('sqlite3')
const loadConfig = require('./loadConfig') // Assuming config is loaded if needed

async function getPrecinctDistricts(precinct) {
  const config = await loadConfig().catch((err) => {
    console.error('Error in loadConfig:', err)
    return
  })

  if (!config) {
    console.error('Unable to load config.')
    return []
  }

  const dbPath = config.dbFile || 'vdt.db'

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
  const config = await loadConfig().catch((err) => {
    console.error('Error in loadConfig:', err)
    return
  })

  if (!config) {
    console.error('Unable to load config.')
    return
  }

  const dbPath = config.dbFile || 'vdt.db' // Path to your SQLite DB file

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

async function getTargetPrecincts() {
  const config = await loadConfig().catch((err) => {
    console.error('Error in loadConfig:', err)
    return
  })

  if (!config) {
    console.error('Unable to load config.')
    return
  }

  const dbPath = config.dbFile || 'vdt.db'

  try {
    // Step 1: Get the target districts
    const targetDistricts = await getTargetDistricts()

    if (targetDistricts.length === 0) {
      console.log('No target districts found.')
      return []
    }

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message)
          return reject(err)
        }
      })

      // Step 2: Find precincts for the target districts
      const query = `
        SELECT DISTINCT precinct 
        FROM districts 
        WHERE district IN (${targetDistricts.map(() => '?').join(',')})
        ORDER BY precinct ASC
      `

      db.all(query, targetDistricts, (err, rows) => {
        if (err) {
          console.error('Error querying database:', err.message)
          reject(err)
        } else {
          const precincts = rows.map((row) => row.precinct)
          resolve(precincts)
        }
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message)
          }
        })
      })
    })
  } catch (err) {
    console.error('Error generating target precincts:', err)
  }
}

async function generateTextMessages() {
  console.log('Text message generation functionality is under construction.')
}

async function generateRecipientsLists() {
  console.log(
    'Recipients lists generation functionality is under construction.',
  )
}

module.exports = {
  getPrecinctDistricts,
  getTargetDistricts,
  getTargetPrecincts,
  generateTextMessages,
  generateRecipientsLists,
}
