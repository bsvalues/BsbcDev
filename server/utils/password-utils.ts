import bcrypt from 'bcrypt';
import { log } from '../vite';

// Number of salt rounds for bcrypt
const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 * @param password Plaintext password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error: any) {
    log(`Error hashing password: ${error.message}`, 'password-utils');
    throw error;
  }
}

/**
 * Compare a plaintext password with a hashed password
 * @param password Plaintext password to check
 * @param hashedPassword Hashed password from database
 * @returns True if passwords match, false otherwise
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    // If the password is stored in plaintext (legacy), compare directly
    if (!hashedPassword.startsWith('$2')) {
      log('Warning: Using plaintext password comparison', 'password-utils');
      return password === hashedPassword;
    }
    
    // Otherwise use bcrypt to compare hashed passwords
    return await bcrypt.compare(password, hashedPassword);
  } catch (error: any) {
    log(`Error comparing passwords: ${error.message}`, 'password-utils');
    throw error;
  }
}

/**
 * Check if a password needs to be migrated from plaintext to hashed
 * @param hashedPassword The stored password
 * @returns True if migration is needed, false otherwise
 */
export function needsPasswordMigration(hashedPassword: string): boolean {
  // If the password doesn't start with $2, it's not a bcrypt hash
  return !hashedPassword.startsWith('$2');
}

/**
 * Generate a secure random password of specified length
 * @param length Length of the password to generate, defaults to 12
 * @returns Random password
 */
export function generateRandomPassword(length = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

/**
 * Validate password strength
 * @param password Password to validate
 * @returns Object with isValid flag and message if invalid
 */
export function validatePasswordStrength(password: string): { isValid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*()_+~`|}{[\]:;?><,./-=]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character' };
  }
  
  return { isValid: true };
}