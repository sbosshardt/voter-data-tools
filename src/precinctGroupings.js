const sqlite3 = require('sqlite3')
const { getPrecinctDistricts } = require('./generateMessages')
const { getGroupingHash } = require('./utils')
const loadConfig = require('./loadConfig')

// Helper function to run db.run() as a promise
function runAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
}

// Helper function to run db.all() as a promise
function allAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        return reject(err)
      }
      resolve(rows)
    })
  })
}

async function initPrecinctsGroupingsTables() {
  const config = await loadConfig().catch((err) => {
    console.error('Error in loadConfig:', err)
    return
  })

  if (!config) {
    console.error('Unable to load config.')
    return
  }

  const dbPath = config.dbFile || 'vdt.db'

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('Error opening database:', err.message)
        return reject(err)
      }

      try {
        // Step 1: Drop and recreate the precincts and groupings tables
        await runAsync(db, `DROP TABLE IF EXISTS precincts`)
        await runAsync(
          db,
          `CREATE TABLE precincts (precinct TEXT PRIMARY KEY, grouping_hash TEXT)`,
        )

        await runAsync(db, `DROP TABLE IF EXISTS groupings`)
        await runAsync(
          db,
          `CREATE TABLE groupings (grouping_hash TEXT PRIMARY KEY, districts_json TEXT)`,
        )

        // Step 2: Get all distinct precincts from the districts table
        const precincts = await allAsync(
          db,
          `SELECT DISTINCT precinct FROM districts`,
        )

        // Step 3: Insert into precincts and groupings tables
        const insertPromises = precincts.map(async (row) => {
          const precinct = row.precinct
          const districts = await getPrecinctDistricts(precinct)

          // Generate grouping hash and districts JSON
          const districtsJson = JSON.stringify(districts)
          const groupingHash = getGroupingHash(districtsJson)

          // Insert into precincts table
          await runAsync(
            db,
            `INSERT INTO precincts (precinct, grouping_hash) VALUES (?, ?)`,
            [precinct, groupingHash],
          )

          // Insert into groupings table
          await runAsync(
            db,
            `INSERT OR IGNORE INTO groupings (grouping_hash, districts_json) VALUES (?, ?)`,
            [groupingHash, districtsJson],
          )
        })

        // Wait for all inserts to complete
        await Promise.all(insertPromises)

        console.log('Precincts and groupings tables initialized successfully.')
        resolve()
      } catch (err) {
        console.error('Error during initialization:', err)
        reject(err)
      } finally {
        // Close the database after all operations are done
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message)
          }
        })
      }
    })
  })
}

module.exports = {
  initPrecinctsGroupingsTables,
}
