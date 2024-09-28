const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')
const loadConfig = require('./config')

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

// Determine the path for the SQLite db file to use.
async function getDbPath() {
  const config = await loadConfig().catch((err) => {
    console.error('Error in loadConfig:', err)
    return
  })

  if (!config) {
    console.error('Unable to load config.')
    return
  }

  const dbPath = config.dbFile || 'vdt.db'
  return dbPath
}

// Function to initialize the SQLite database
async function initializeDatabase(dbFile = null) {
  let dbPath
  config = await loadConfig()

  if (dbFile === null) {
    // Default config is to create vdt.db in the data directory.
    dbPath = path.join(__dirname, '../' + config.dbFile)
    console.log('dbPath is:', dbPath)
  } else if (path.isAbsolute(dbFile) || dbFile.includes(path.sep)) {
    // If an absolute or relative path is provided, resolve it
    dbPath = path.resolve(dbFile)
  } else {
    // If only a filename is provided, create it in the current working directory
    dbPath = path.join(process.cwd(), dbFile)
  }

  // Ensure the directory exists for the database file
  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  // Create and open a new SQLite database
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      return console.error('Error creating database:', err.message)
    }
    console.log(`Connected to the SQLite database: ${dbPath}`)
  })

  // You can add additional tables or schema creation here if needed in the future
  db.serialize(() => {
    console.log('Database created successfully.')
  })

  // Close the database connection
  db.close((err) => {
    if (err) {
      return console.error('Error closing the database:', err.message)
    }
    console.log(`Closed the SQLite database connection: ${dbPath}`)
  })
}

module.exports = {
  allAsync,
  getDbPath,
  initializeDatabase,
  runAsync,
}
