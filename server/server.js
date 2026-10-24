'use strict';
require('dotenv').config({ path: './.env' });

// Verify dotenv loaded Firebase variables
console.log('[DotEnv] FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Undefined');
console.log('[DotEnv] FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Undefined');
console.log('[DotEnv] FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Undefined');

const app = require('./src/app');
const initReminderCron = require('./src/services/reminderCron');

const PORT = process.env.PORT || 5000;

// Initialize Cron Jobs
initReminderCron();

const server = app.listen(PORT, () => {
  console.log(`\n Real Estate CRM API Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(` Server listening on port ${PORT}`);
  console.log(` Base URL: http://localhost:${PORT}/api\n`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...', err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...', err.name, err.message);
  process.exit(1);
});
