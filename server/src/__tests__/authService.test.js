// =============================================================================
// Auth Service Unit Tests
// =============================================================================

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn().mockReturnValue({ userId: 'test-user-id', sessionId: 'test-session-id' })
}));

// Mock database
jest.mock('../utils/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  transaction: jest.fn()
}));

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set environment variables for testing
    process.env.JWT_SECRET = 'test-secret';
    process.env.BCRYPT_ROUNDS = '12';
  });

  describe('hashPassword', () => {
    it('should hash a password using bcrypt', async () => {
      const bcrypt = require('bcrypt');
      const { hashPassword } = require('../services/authService');

      const password = 'TestPassword123!';
      const result = await hashPassword(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe('$2b$12$hashedpassword');
    });
  });

  describe('verifyPassword', () => {
    it('should verify password against hash', async () => {
      const bcrypt = require('bcrypt');
      const { verifyPassword } = require('../services/authService');

      const password = 'TestPassword123!';
      const hash = '$2b$12$hashedpassword';
      const result = await verifyPassword(password, hash);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValueOnce(false);

      const { verifyPassword } = require('../services/authService');

      const result = await verifyPassword('wrong', 'hash');

      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token', () => {
      const jwt = require('jsonwebtoken');
      const { generateToken } = require('../services/authService');

      const userId = 'user-123';
      const sessionId = 'session-456';
      const result = generateToken(userId, sessionId);

      expect(jwt.sign).toHaveBeenCalled();
      expect(result).toBe('mock.jwt.token');
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a JWT token', () => {
      const jwt = require('jsonwebtoken');
      const { verifyToken } = require('../services/authService');

      const token = 'test.jwt.token';
      const result = verifyToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('sessionId');
    });
  });
});
