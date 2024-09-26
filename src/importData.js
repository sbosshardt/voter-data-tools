const sqlite3 = require('sqlite3')
const fs = require('fs')
const csvParser = require('csv-parser')
const loadConfig = require('./loadConfig')

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
  const dbPath = config.dbFile || 'vdt.db'
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message)
      return
    }
  })

  db.serialize(() => {
    // Step 1: Drop the existing table if it exists
    db.run(`DROP TABLE IF EXISTS ${table}`, (err) => {
      if (err) {
        console.error(`Error dropping table ${table}:`, err.message)
        return
      }
    })

    // Create the table with the specified columns and data types
    const columnsDefinition = Object.entries(mappings)
      .map(([sqliteCol, details]) => `${sqliteCol} ${details.type}`)
      .join(', ')

    const createTableSQL = `CREATE TABLE ${table} (${columnsDefinition})`
    db.run(createTableSQL, (err) => {
      if (err) {
        console.error(`Error creating table ${table}:`, err.message)
        return
      } else {
        console.log(`Table ${table} created successfully.`)
      }
    })
  })

  // Read the CSV file using the specified delimiter
  const csvData = []
  fs.createReadStream(filename)
    .pipe(csvParser({ separator: delimiter })) // Use the specified delimiter
    .on('data', (row) => {
      const mappedRow = {}
      for (const [sqliteCol, details] of Object.entries(mappings)) {
        mappedRow[sqliteCol] = row[details.csv] // Use the mapping defined in the config
      }
      csvData.push(mappedRow)
    })
    .on('end', async () => {
      console.log(`Finished reading CSV file: ${filename}`)

      try {
        await insertData(db, table, csvData)
        console.log(`CSV data successfully imported into table ${table}.`)
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message)
          } else {
            console.log('Database connection closed.')
          }
        })
      } catch (err) {
        console.error('Error during data insert:', err)
        db.close()
      }
    })
}

// Function to handle row insertions within a transaction
async function insertData(db, table, csvData) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          return reject(`Error starting transaction: ${err.message}`)
        }

        csvData.forEach((row, index) => {
          const columns = Object.keys(row).join(', ')
          const placeholders = Object.keys(row)
            .map(() => '?')
            .join(', ')
          const values = Object.values(row)
          const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`

          db.run(sql, values, (err) => {
            if (err) {
              console.error(`Error inserting row ${index}:`, err.message)
            }
          })
        })

        db.run('COMMIT', (err) => {
          if (err) {
            return reject(`Error committing transaction: ${err.message}`)
          }
          resolve()
        })
      })
    })
  })
}

async function importDistrictsCsv() {
  return await importCsv('districts')
}

async function importVotersCsv() {
  return await importCsv('voters')
}

module.exports = {
  importCsv,
  importDistrictsCsv,
  importVotersCsv,
}
