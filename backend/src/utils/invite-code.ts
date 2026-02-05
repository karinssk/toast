import { customAlphabet } from 'nanoid';

// Use only uppercase letters and numbers, excluding confusing characters (0, O, I, 1, L)
const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// Create a custom nanoid generator for 6-character codes
const generateCode = customAlphabet(alphabet, 6);

/**
 * Generate a unique 6-character invite code
 */
export function generateInviteCode(): string {
  return generateCode();
}

/**
 * Validate invite code format
 */
export function isValidInviteCode(code: string): boolean {
  if (code.length !== 6) return false;
  return /^[A-Z0-9]+$/.test(code);
}
