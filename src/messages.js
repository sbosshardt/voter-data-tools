const sqlite3 = require('sqlite3')
const {
  getPrecinctsByGroupingHash,
  getPhoneNumbersAndNamesInPrecincts,
} = require('./precincts')
const { getCandidatesForDistricts } = require('./candidates')
const { decodeDistricts } = require('./districts')
const { getDbPath, allAsync, runAsync } = require('./database')
const { capitalizeName } = require('./utils')
const { loadConfig } = require('./config')

// Function to initialize the text_messages table
async function initTextMessagesTable() {
  const dbPath = await getDbPath()

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('Error opening database:', err.message)
        return reject(err)
      }

      try {
        // Step 1: Drop the text_messages table if it exists (optional)
        await runAsync(db, `DROP TABLE IF EXISTS text_messages`)

        // Step 2: Create the text_messages table with the required schema
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS text_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id TEXT,
            grouping_hash TEXT,
            body TEXT,
            precincts TEXT,
            recipients TEXT
          )
        `
        await runAsync(db, createTableSQL)

        console.log('text_messages table initialized successfully.')
        resolve()
      } catch (err) {
        console.error('Error initializing text_messages table:', err)
        reject(err)
      } finally {
        // Step 3: Close the database connection
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message)
          }
        })
      }
    })
  })
}

// Function to generate text messages
async function generateTextMessages(batch_id = '') {
  // Step 1: Initialize the text_messages table
  await initTextMessagesTable()

  // Step 2: Load configuration settings (txtTemplate and listingTemplate)
  const config = await loadConfig()
  const txtTemplate =
    config.txtTemplate ||
    'Endorsed candidates:\n$listings\nFor more info, see our website.'
  const listingTemplate = config.listingTemplate || '$candidate - $office\n'

  // Step 3: Get the database path
  const dbPath = await getDbPath()

  // Step 4: Open SQLite database and fetch target groupings
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('Error opening database:', err.message)
        return reject(err)
      }

      try {
        // Remove existing batch (if present)
        await runAsync(db, `DELETE FROM text_messages WHERE batch_id = ?`, [
          batch_id,
        ])

        // Query all rows from target_groupings table
        const groupings = await allAsync(
          db,
          'SELECT grouping_hash, districts_json FROM target_groupings',
        )

        // Step 5: Loop through each grouping to generate a message
        const insertPromises = groupings.map(async (grouping) => {
          const { grouping_hash, districts_json } = grouping

          // Decode districts from JSON
          const districts = decodeDistricts(districts_json)

          // Get candidate listings for the districts
          const candidates = await getCandidatesForDistricts(districts)

          // Build the listings using listingTemplate
          let listings = ''
          Object.entries(candidates).forEach(([candidate, office]) => {
            listings += listingTemplate
              .replace('$candidate', candidate)
              .replace('$office', office)
          })

          // Assuming precincts and recipients will be generated/populated later (currently placeholders)
          const precincts = await getPrecinctsByGroupingHash(grouping_hash)
          const sPrecincts = precincts.join('\n')
          const phones_names =
            await getPhoneNumbersAndNamesInPrecincts(precincts)
          // Start with the CSV header
          let csvString = 'phone,name\n'
          // Loop through the object and append each phone and name as a new row
          for (const [phone, name] of Object.entries(phones_names)) {
            const adjustedName = capitalizeName(name)
            csvString += `${phone},${adjustedName}\n`
          }

          // Build the message body using txtTemplate
          const body = txtTemplate.replace('$listings', listings)

          // Insert the generated message into the text_messages table
          await runAsync(
            db,
            `INSERT INTO text_messages (batch_id, grouping_hash, body, precincts, recipients) VALUES (?, ?, ?, ?, ?)`,
            [batch_id, grouping_hash, body, sPrecincts, csvString],
          )
        })

        // Wait for all inserts to complete
        await Promise.all(insertPromises)

        console.log('Text messages generated and inserted successfully.')
        resolve()
      } catch (err) {
        console.error('Error generating text messages:', err)
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

async function generateRecipientsLists() {
  console.log(
    'Recipients lists generation functionality is under construction.',
  )
}

module.exports = {
  generateTextMessages,
  generateRecipientsLists,
  initTextMessagesTable,
}
