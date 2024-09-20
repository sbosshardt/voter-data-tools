const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');

// Function to read the input CSV file and load data into memory
function readCsvData(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => rows.push(data))
      .on('end', () => resolve(rows))
      .on('error', (err) => reject(err));
  });
}

// Function to generate random rows from the input CSV data
function generateRandomRows(data, numRows) {
  const headers = Object.keys(data[0]); 
  const randomRows = [];

  for (let i = 0; i < numRows; i++) {
    const randomRow = {};
    headers.forEach((header) => {
      const randomIndex = Math.floor(Math.random() * data.length); 
      randomRow[header] = data[randomIndex][header]; 
    });
    randomRows.push(randomRow);
  }

  return randomRows;
}

// Function to write random rows to a new CSV file
function writeCsvData(filePath, data, headers) {
  const csvWriter = createCsvWriter({
    path: filePath,
    header: headers.map((header) => ({ id: header, title: header })),
  });

  return csvWriter.writeRecords(data);
}

// Main function to generate sample CSV
async function generateSampleCsv(inputCsv, outputCsv, numRows) {
  try {
    const data = await readCsvData(inputCsv);
    const headers = Object.keys(data[0]);
    const randomRows = generateRandomRows(data, numRows);

    await writeCsvData(outputCsv, randomRows, headers);
    console.log(`Successfully created a sample CSV file with ${numRows} rows at ${outputCsv}`);
  } catch (error) {
    console.error('Error generating sample CSV:', error);
  }
}

module.exports = generateSampleCsv;
