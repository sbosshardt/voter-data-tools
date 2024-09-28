const sqlite3 = require('sqlite3')
const { runAsync, allAsync, getDbPath } = require('./database')
const { getPrecinctDistricts, getTargetDistricts } = require('./districts')
const { getGroupingHash } = require('./utils')

async function initPrecinctsGroupingsTables() {
  const dbPath = await getDbPath()

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

async function getTargetPrecincts() {
  const dbPath = await getDbPath()

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

module.exports = {
  initPrecinctsGroupingsTables,
  getTargetPrecincts,
}
