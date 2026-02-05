// =============================================================================
// Auth Service Unit Tests
// =============================================================================

import * as bcrypt from '@node-rs/bcrypt';
import * as jwt from 'jsonwebtoken';


// Mock bcrypt
jest.mock('@node-rs/bcrypt', () => ({
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
    __esModule: true,
    default: {
        query: jest.fn(),
        getClient: jest.fn(),
        transaction: jest.fn()
    }
}));

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

const loadAuthService = async () => {
    return await import('../services/authService');
};

describe('Auth Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Set environment variables for testing
        process.env.JWT_SECRET = 'test-secret';
        process.env.BCRYPT_ROUNDS = '12';
    });

    describe('hashPassword', () => {
        it('should hash a password using bcrypt', async () => {
            const password = 'TestPassword123!';
            const service = await loadAuthService();
            const result = await service.hashPassword(password);

            expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 12);
            expect(result).toBe('$2b$12$hashedpassword');
        });
    });

    describe('verifyPassword', () => {
        it('should verify password against hash', async () => {
            const password = 'TestPassword123!';
            const hash = '$2b$12$hashedpassword';
            const service = await loadAuthService();
            const result = await service.verifyPassword(password, hash);

            expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hash);
            expect(result).toBe(true);
        });

        it('should return false for incorrect password', async () => {
            mockedBcrypt.compare.mockResolvedValueOnce(false);

            const service = await loadAuthService();
            const result = await service.verifyPassword('wrong', 'hash');

            expect(result).toBe(false);
        });
    });

    describe('generateToken', () => {
        it('should generate a JWT token', async () => {
            const userId = 'user-123';
            const sessionId = 'session-456';
            const service = await loadAuthService();
            const result = service.generateToken(userId, sessionId);

            expect(mockedJwt.sign).toHaveBeenCalled();
            expect(result).toBe('mock.jwt.token');
        });
    });

    describe('verifyToken', () => {
        it('should verify and decode a JWT token', async () => {
            const token = 'test.jwt.token';
            const service = await loadAuthService();
            const result = service.verifyToken(token);

            expect(mockedJwt.verify).toHaveBeenCalledWith(token, 'test-secret');
            expect(result).toHaveProperty('userId');
            expect(result).toHaveProperty('sessionId');
        });
    });
});
