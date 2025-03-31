import bcrypt from 'bcrypt';
import { log } from '../vite';

const SALT_ROUNDS = 10;
const BCRYPT_PATTERN = /^\$2[aby]\$.{56}$/;

/**
 * Hash a password using bcrypt
 * @param password Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error: any) {
    log(`Error hashing password: ${error.message}`, 'password-utils');
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against a hash
 * @param password Plain text password
 * @param hash Hashed password
 * @returns Boolean indicating if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    if (!hash || !password) {
      return false;
    }
    return await bcrypt.compare(password, hash);
  } catch (error: any) {
    log(`Error verifying password: ${error.message}`, 'password-utils');
    return false;
  }
}

/**
 * Check if a password needs migration (is stored as plaintext)
 * @param hash Stored password hash or plaintext password
 * @returns Boolean indicating if password needs migration
 */
export function needsPasswordMigration(hash: string): boolean {
  if (!hash) {
    return false;
  }
  // If the password doesn't match the bcrypt pattern, it's stored as plaintext
  return !BCRYPT_PATTERN.test(hash);
}