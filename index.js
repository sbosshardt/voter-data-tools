#!/usr/bin/env node
const handleCommand = require('./src/cli')

// Pass the command-line arguments to the CLI handler
handleCommand(process.argv)
