'use strict';
const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n═══════════════════════════════════════════════════');
console.log('  VAPID Keys Generated Successfully');
console.log('═══════════════════════════════════════════════════\n');
console.log('Add the following to your server/.env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@veenucrm.com`);
console.log('\nAlso add the public key to your frontend/.env file:\n');
console.log(`VITE_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log('\n═══════════════════════════════════════════════════\n');
