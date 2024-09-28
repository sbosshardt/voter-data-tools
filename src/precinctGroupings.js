const sqlite3 = require('sqlite3')
const {
  getPrecinctDistricts,
  getTargetDistricts,
} = require('./generateMessages')
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
        // Step 1: Drop and recreate the target_precincts and target_groupings tables
        await runAsync(db, `DROP TABLE IF EXISTS target_precincts`)
        await runAsync(
          db,
          `CREATE TABLE target_precincts (precinct TEXT PRIMARY KEY, grouping_hash TEXT)`,
        )

        await runAsync(db, `DROP TABLE IF EXISTS target_groupings`)
        await runAsync(
          db,
          `CREATE TABLE target_groupings (grouping_hash TEXT PRIMARY KEY, districts_json TEXT)`,
        )
        const targetDistricts = await getTargetDistricts()
        const candidateDistricts = await getTargetDistricts(true)
        // Step 2: Get all distinct precincts from the districts table
        const precincts = await allAsync(
          db,
          `SELECT DISTINCT precinct
           FROM districts
           WHERE district IN (${targetDistricts.map(() => '?').join(',')})
           ORDER BY precinct ASC`,
          targetDistricts,
        )

        // Step 3: Insert into precincts and groupings tables
        const insertPromises = precincts.map(async (row) => {
          const precinct = row.precinct
          const districts = await getPrecinctDistricts(precinct)
          // Filter the districts based on what there are candidates for...
          const precinctCandidateDistricts = districts.filter((district) =>
            candidateDistricts.includes(district),
          )

          // Generate grouping hash and precinctCandidateDistricts JSON
          const ptDistrictsJson = JSON.stringify(precinctCandidateDistricts)
          const groupingHash = getGroupingHash(ptDistrictsJson)

          // Insert into target_precincts table
          await runAsync(
            db,
            `INSERT INTO target_precincts (precinct, grouping_hash) VALUES (?, ?)`,
            [precinct, groupingHash],
          )

          // Insert into target_groupings table
          await runAsync(
            db,
            `INSERT OR IGNORE INTO target_groupings (grouping_hash, districts_json) VALUES (?, ?)`,
            [groupingHash, ptDistrictsJson],
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
