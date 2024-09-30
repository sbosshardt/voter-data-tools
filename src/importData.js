const sqlite3 = require('sqlite3')
const fs = require('fs')
const csvParser = require('csv-parser')
const { loadConfig } = require('./config')
const { getDbPath, runAsync } = require('./database')

// Helper function to insert data into SQLite using transactions and batch inserts
async function insertData(db, table, csvData) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION')

      // Prepare the insert statement
      const placeholders = Object.keys(csvData[0])
        .map(() => '?')
        .join(', ')
      const columns = Object.keys(csvData[0]).join(', ')
      const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`
      const stmt = db.prepare(sql)

      for (const row of csvData) {
        stmt.run(Object.values(row), (err) => {
          if (err) {
            console.error('Error inserting row:', err.message)
            return reject(err)
          }
        })
      }

      stmt.finalize((err) => {
        if (err) {
          console.error('Error finalizing statement:', err.message)
          return reject(err)
        }

        // Commit the transaction after all rows are inserted
        db.run('COMMIT', (err) => {
          if (err) {
            console.error('Error committing transaction:', err.message)
            return reject(err)
          }
          resolve()
        })
      })
    })
  })
}

// Refactored function to make it awaitable and faster
async function importCsv(table, filePath = null) {
  // Load the configuration
  const config = await loadConfig().catch((err) => {
    console.error('Error in loadConfig:', err)
    return
  })

  if (!config) {
    console.error('Unable to load config.')
    return
  }

  // Check if the config version matches
  const expectedCfgVersion = 1 // Expected config version
  if (config.cfgVersion !== expectedCfgVersion) {
    console.error(
      `Config version mismatch. Expected ${expectedCfgVersion}, but got ${config.cfgVersion}.`,
    )
    return
  }

  // Get the table's column mappings and the CSV file path
  const tableConfig = config.csv_mappings[table]
  const mappings = tableConfig.columns
  const filename = filePath || tableConfig.csvFilePath
  const delimiter = tableConfig.delimiter || ',' // Default to comma if not specified

  // Open the SQLite database
  const dbPath = await getDbPath()
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message)
      throw err
    }
  })

  // Promisify the db.serialize block
  await new Promise((resolve, reject) => {
    db.serialize(() => {
      // Step 1: Drop the existing table if it exists
      db.run(`DROP TABLE IF EXISTS ${table}`, (err) => {
        if (err) {
          console.error(`Error dropping table ${table}:`, err.message)
          return reject(err)
        }
      })

      // Step 2: Create the table with the specified columns and data types
      const columnsDefinition = Object.entries(mappings)
        .map(([sqliteCol, details]) => `${sqliteCol} ${details.type}`)
        .join(', ')

      const createTableSQL = `CREATE TABLE ${table} (${columnsDefinition})`
      db.run(createTableSQL, (err) => {
        if (err) {
          console.error(`Error creating table ${table}:`, err.message)
          return reject(err)
        } else {
          console.log(`Table ${table} created successfully.`)
        }
      })
      resolve()
    })
  })

  // Read the CSV file using the specified delimiter and return a promise
  const csvData = await new Promise((resolve, reject) => {
    const data = []
    fs.createReadStream(filename)
      .pipe(csvParser({ separator: delimiter })) // Use the specified delimiter
      .on('data', (row) => {
        const mappedRow = {}
        for (const [sqliteCol, details] of Object.entries(mappings)) {
          let value = row[details.csv]

          // Handle case-insensitive "yes", "true", "no", "false" for INTEGER columns
          if (details.type === 'INTEGER') {
            value = value?.toLowerCase()
            if (value === 'yes' || value === 'true') {
              value = 1
            } else if (value === 'no' || value === 'false') {
              value = 0
            } else {
              value = parseInt(value, 10) || 0 // Convert to integer, default to 0 if invalid
            }
          }

          mappedRow[sqliteCol] = value
        }
        data.push(mappedRow)
      })
      .on('end', () => {
        console.log(`Finished reading CSV file: ${filename}`)
        resolve(data)
      })
      .on('error', (err) => {
        reject(err)
      })
  })

  // Insert data into the database using a transaction
  await insertData(db, table, csvData)
  console.log(`CSV data successfully imported into table ${table}.`)

  // Close the database connection
  await new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message)
        return reject(err)
      }
      console.log('Database connection closed.')
      resolve()
    })
  })
}

async function importDistrictsCsv() {
  return await importCsv('districts')
}

async function importVotersCsv() {
  return await importCsv('voters')
}

async function importCandidatesCsv() {
  return await importCsv('candidates')
}

module.exports = {
  importCsv,
  importCandidatesCsv,
  importDistrictsCsv,
  importVotersCsv,
}
