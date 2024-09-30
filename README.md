# Voter Data Tools

Voter Data Tools is a utility for generating text messages for precinct-level endorsement lists campaigns, and tracking expenditures for candidates. This tool imports data from CSV files and helps automate the process of organizing precinct groupings, generating text messages, and exporting the necessary information for outreach efforts.

## Features

- **CSV Import**: Import precinct districts, voters, and candidate endorsements from CSV files.
- **Text Message Generation**: Automatically generate targeted text messages based on precinct and candidate data.
- **Candidate Expenditure Tracking**: Track the text messaging expenditures for each candidate.
- **Sample Data Generation**: Generate sample CSV files for testing purposes.
- **Expenditure Export**: Export candidate expenditures and text message data to CSV files.
- **Command Line Interface (CLI)**: Easily run the various functions of the tool via a CLI.

## Requirements

- Node.js v14 or higher
- SQLite3
- `npm install` to install all required dependencies listed in `package.json`

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/sbosshardt/voter-data-tools.git
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Ensure you have a configured `config.json` file. If not, the program will create a default one based on `config-defaults.json`.

## Usage

You can run the tool via the CLI with different commands depending on the task you want to accomplish. The basic syntax is:

```bash
./vdt [command] [options]
```

For example, to import precinct districts, you would run:

```bash
./vdt import-districts
```

### Commands

| Command                           | Description                                                                |
| --------------------------------- | -------------------------------------------------------------------------- |
| `run-all`                         | Import tables, generate groupings & texts, export all data.                |
| `generate-sample`                 | Generate a sample CSV file for testing purposes.                           |
| `init-db [dbfile]`                | Initialize the SQLite database. Optionally specify the database file.      |
| `import-districts`                | Import precinct districts from CSV.                                        |
| `import-candidates`               | Import candidate endorsements from CSV.                                    |
| `import-voters`                   | Import voter data from CSV.                                                |
| `precinct-districts <precinct>`   | Get districts a specific precinct is part of.                              |
| `target-districts`                | Get the districts that should be targeted based on candidate endorsements. |
| `target-precincts`                | Get precincts to be targeted for the text message campaign.                |
| `generate-groupings`              | Generate the `target_precincts` and `target_groupings` tables.             |
| `generate-messages` [batch_id]    | Generate text messages for the campaign. Optionally provide a batch ID.    |
| `export-messages-csv [directory]` | Export the generated text messages and recipients info to CSV files.       |
| `candidate-expenditures`          | Show the expenditures for each candidate.                                  |
| `help` or `--help`                | Show this help message.                                                    |

### Example Workflow

#### Quick and Easy Way:

```bash
./vdt run-all
```

#### Manual Way:

1. Initialize the database:

   ```bash
   ./vdt init-db
   ```

2. Import your CSV files:
   ```bash
   ./vdt import-districts
   ./vdt import-candidates
   ./vdt import-voters
   ```
3. Generate groupings and messages:
   ```bash
   ./vdt generate-groupings
   ./vdt generate-messages
   ```
4. Export the text messages (and candidates expenditures sheet) to CSV:
   ```bash
   ./vdt export-messages-csv
   ```

### Tracking Candidate Expenditures

Candidate expenditures are tracked based on the cost of sending text messages. For instance, if a text costs $1 to send to all recipients and there are two candidates, each candidate gets $0.50 added to their total expenditures. These expenditures can be exported using the following command:

```bash
./vdt candidate-expenditures
```

This generates a candidates_expenditures.csv file, which details total expenditures for each candidate. Note: This occurs automatically when running `./vdt generate-messages`.

## Configuration

The configuration files `config-defaults.json` and `config.json` should be properly set up. These files control paths for CSV imports, templates for messages, and other settings.

Key configuration fields:

- `txtTemplate`: Template for text message generation.
- `listingTemplate`: Template for formatting the candidate listings in messages.
- `csv_mappings`: Maps the CSV files' columns to database fields.
- `textMessagesDefaultExportDir`: Default directory for exporting the text messages.

## Expenditure Tracking

The `candidates_expenditures.csv` file contains the text messaging expenditure for each candidate. The expenditures are calculated based on the cost of sending text messages, typically set to $0.05 per recipient.

- **Text Message Costs**: The costs are split among all candidates in a message. For example, if two candidates appear in a text message costing $1, each candidate's expenditure is increased by $0.50.

This tracking allows campaigns to efficiently manage and review how much they are spending per candidate on text messaging outreach.

## License

This project is licensed under the GPL 2.0 License.
