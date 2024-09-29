const sqlite3 = require('sqlite3')
const { getDbPath, allAsync } = require('./database')

async function getCandidatesForDistricts(districts) {
  const dbPath = await getDbPath()

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('Error opening database:', err.message)
        return reject(err)
      }

      try {
        // Construct the SQL query
        const query = `SELECT name, office
                       FROM candidates
                       WHERE unopposed = 0
                       AND district IN (${districts.map(() => '?').join(',')})
                       ORDER BY weight ASC`

        // Execute the query with the districts array
        const candidates = await allAsync(db, query, districts)

        // Transform the query result into the desired object format
        const candidateListings = {}
        candidates.forEach((row) => {
          candidateListings[row.name] = row.office
        })

        resolve(candidateListings)
      } catch (err) {
        console.error('Error querying candidates:', err)
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
  getCandidatesForDistricts,
}
