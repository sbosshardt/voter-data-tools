const sqlite3 = require('sqlite3')
const {
  getPrecinctsByGroupingHash,
  getPhoneNumbersAndNamesInPrecincts,
} = require('./precincts')
const { getCandidatesForDistricts } = require('./candidates')
const { decodeDistricts } = require('./districts')
const { exportCandidatesExpendituresCsv } = require('./expenditures')
const { getDbPath, allAsync, runAsync } = require('./database')
const {
  capitalizeName,
  escapeCsvField,
  getCostPerRecipient,
  getCsvOutputDir,
} = require('./utils')
const { loadConfig } = require('./config')
const fs = require('fs')
const path = require('path')
const { EOL } = require('os')

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
            num_candidates INTEGER,
            num_recipients INTEGER,
            cost_per_recipient REAL,
            total_cost REAL,
            cost_per_candidate REAL,
            candidates TEXT,
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

        const costPerRecipient = await getCostPerRecipient()

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
          const sCandidates = await JSON.stringify(candidates)
          const numCandidates = Object.keys(candidates).length

          // Assuming precincts and recipients will be generated/populated later (currently placeholders)
          const precincts = await getPrecinctsByGroupingHash(grouping_hash)
          const sPrecincts = precincts.join('\n')
          const phones_names =
            await getPhoneNumbersAndNamesInPrecincts(precincts)
          console.log('phones_names:', phones_names)
          // Start with the CSV header
          let csvString = 'phone,name\n'
          // Loop through the object and append each phone and name as a new row
          for (const [phone, name] of Object.entries(phones_names)) {
            const adjustedName = capitalizeName(name)
            csvString += `${phone},${adjustedName}\n`
          }
          const numRecipients = Object.keys(phones_names).length
          console.log('numRecipients:', numRecipients)
          const totalCost = costPerRecipient * numRecipients
          const costPerCandidate = (1.0 * totalCost) / numCandidates

          // Build the message body using txtTemplate
          const body = txtTemplate.replace('$listings', listings)

          // Insert the generated message into the text_messages table
          await runAsync(
            db,
            `INSERT INTO text_messages
            (batch_id, grouping_hash, body, precincts,
             num_candidates, num_recipients,
             cost_per_recipient, total_cost, cost_per_candidate,
             candidates, recipients)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              batch_id,
              grouping_hash,
              body,
              sPrecincts,
              numCandidates,
              numRecipients,
              costPerRecipient,
              totalCost,
              costPerCandidate,
              sCandidates,
              csvString,
            ],
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

// Function to retrieve all messages from the database
async function getTextMessages() {
  const dbPath = await getDbPath()
  const query = 'SELECT * FROM text_messages'

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('Error opening database:', err.message)
        return reject(err)
      }

      try {
        // Fetch all messages from the text_messages table
        const messages = await allAsync(db, query)
        resolve(messages)
      } catch (err) {
        console.error('Error retrieving messages:', err.message)
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

// Function to export messages to a CSV file
async function exportMessagesCsv(outputCsvDir = null) {
  const oDir = await getCsvOutputDir(outputCsvDir)
  const exportFile = oDir + '/text_messages.csv'
  try {
    // Get all messages from the database
    const messages = await getTextMessages()

    // Prepare the CSV header
    const csvHeader =
      'batch_id,grouping_hash,body,precincts,num_candidates,num_recipients,cost_per_recipient,total_cost,cost_per_candidate,candidates' +
      EOL

    // Create the CSV file and write the header
    fs.writeFileSync(exportFile, csvHeader)

    // Loop through the messages and write each row to the CSV file
    messages.forEach((message) => {
      const csvRow =
        [
          escapeCsvField(message.batch_id),
          escapeCsvField(message.grouping_hash),
          escapeCsvField(message.body),
          escapeCsvField(message.precincts),
          escapeCsvField(message.num_candidates),
          escapeCsvField(message.num_recipients),
          escapeCsvField(message.cost_per_recipient),
          escapeCsvField(message.total_cost),
          escapeCsvField(message.cost_per_candidate),
          escapeCsvField(message.candidates),
        ].join(',') + EOL

      // Write the message data to the CSV file
      fs.appendFileSync(exportFile, csvRow)

      // Export recipients to individual CSV files
      const exportRecipientsFile =
        oDir + '/recipients-' + message.grouping_hash + '.csv'
      fs.writeFileSync(exportRecipientsFile, message.recipients)
    })

    console.log(`Messages exported successfully to ${oDir}`)
    exportCandidatesExpendituresCsv(outputCsvDir)
  } catch (err) {
    console.error('Error exporting messages:', err.message)
    console.log(err)
  }
}

module.exports = {
  generateTextMessages,
  exportMessagesCsv,
  initTextMessagesTable,
  getTextMessages,
}
