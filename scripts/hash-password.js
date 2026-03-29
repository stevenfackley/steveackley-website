import bcrypt from 'bcrypt';
// scripts/hash-password.js
//const bcrypt = require('bcrypt');

const plainPassword = process.argv[2]; // Get password from command line argument
const saltRounds = 10; // The cost factor, adjust as needed

if (!plainPassword) {
  console.error('Please provide a password as a command line argument: node scripts/hash-password.js <password>');
  process.exit(1);
}

bcrypt.hash(plainPassword, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  console.log('Hashed Password:', hash);
});
