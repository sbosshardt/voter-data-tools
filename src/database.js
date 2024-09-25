const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')

// Function to initialize the SQLite database
async function initializeDatabase(dbFile = 'vdt.db') {
  let dbPath

  if (dbFile === 'vdt.db') {
    // Default behavior: create vdt.db in the data directory
    dbPath = path.join(__dirname, '../data', dbFile)
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

module.exports = initializeDatabase
