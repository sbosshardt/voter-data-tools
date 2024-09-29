const sqlite3 = require('sqlite3')
const { runAsync, allAsync, getDbPath } = require('./database')
const {
  encodeDistricts,
  getPrecinctDistricts,
  getTargetDistricts,
} = require('./districts')
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
          const ptDistrictsJson = encodeDistricts(precinctCandidateDistricts)
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

// Function to get precincts by grouping_hash
async function getPrecinctsByGroupingHash(grouping_hash) {
  const dbPath = await getDbPath()

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('Error opening database:', err.message)
        return reject(err)
      }

      try {
        // Query the target_precincts table for the given grouping_hash
        const query = `SELECT precinct FROM target_precincts WHERE grouping_hash = ?`
        const precinctRows = await allAsync(db, query, [grouping_hash])

        // Map the result rows to an array of precincts
        const precincts = precinctRows.map((row) => row.precinct)

        resolve(precincts)
      } catch (err) {
        console.error('Error querying precincts:', err)
        reject(err)
      } finally {
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message)
          }
        })
      }
    })
  })
}

// Function to get phone numbers and first names for voters in given precincts
async function getPhoneNumbersAndNamesInPrecincts(precincts) {
  const dbPath = await getDbPath()

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('Error opening database:', err.message)
        return reject(err)
      }

      try {
        // Query voters table for phone numbers and first names in the given precincts
        const placeholders = precincts.map(() => '?').join(', ')
        const query = `
          SELECT first_name, phone_1, phone_2 FROM voters
          WHERE precinct IN (${placeholders})
        `
        const voterRows = await allAsync(db, query, precincts)

        // Prepare an object with phone numbers as keys and first names as values
        const phoneNumberMap = {}
        voterRows.forEach((row) => {
          // Add phone_1 and phone_2 with first_name as the value if they exist
          if (row.phone_1 && row.phone_1.trim()) {
            phoneNumberMap[row.phone_1.trim()] = row.first_name
          }
          if (row.phone_2 && row.phone_2.trim()) {
            phoneNumberMap[row.phone_2.trim()] = row.first_name
          }
        })

        resolve(phoneNumberMap)
      } catch (err) {
        console.error('Error querying phone numbers and names:', err)
        reject(err)
      } finally {
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
  getPrecinctsByGroupingHash,
  getPhoneNumbersAndNamesInPrecincts,
  getTargetPrecincts,
}
