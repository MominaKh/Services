const jwt = require('jsonwebtoken');
require('dotenv').config();

// Create a test token
const createTestToken = () => {
  const testUser = {
    userId: '123456789',
    email: 'test@example.com'
  };

  return jwt.sign(testUser, process.env.JWT_SECRET, { expiresIn: '1h' });
};

console.log('Test Token:', createTestToken());