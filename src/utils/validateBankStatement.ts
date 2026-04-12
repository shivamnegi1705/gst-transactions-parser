import { ValidationResult } from '../types';

/** Regex for account number patterns (sequences of 8+ digits) */
const ACCOUNT_NUMBER_PATTERN = /\d{8,}/;

/** Regex for date patterns like DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD */
const DATE_PATTERN = /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})\b/;

/**
 * Common transaction table header keyword groups.
 * Each group contains alternative keywords — at least one from each group must be present.
 */
const TABLE_HEADER_GROUPS: string[][] = [
  ['date'],
  ['description', 'particulars'],
  ['amount', 'deposits', 'withdrawals', 'balance'],
];

/**
 * Validates that extracted PDF text conforms to the expected bank statement structure.
 *
 * Checks for three structural markers:
 * 1. Account number patterns (8+ digit sequences)
 * 2. Date patterns (DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD)
 * 3. Transaction table headers (Date, Description, Amount)
 *
 * @param pdfText - The extracted text content from a PDF file
 * @returns ValidationResult indicating whether the text is a valid bank statement
 */
export function validateBankStatement(pdfText: string): ValidationResult {
  if (!ACCOUNT_NUMBER_PATTERN.test(pdfText)) {
    return { valid: false, reason: 'No account number pattern found' };
  }

  if (!DATE_PATTERN.test(pdfText)) {
    return { valid: false, reason: 'No date patterns found' };
  }

  const lowerText = pdfText.toLowerCase();
  const missingGroups = TABLE_HEADER_GROUPS.filter(
    (group) => !group.some((keyword) => lowerText.includes(keyword))
  );

  if (missingGroups.length > 0) {
    return { valid: false, reason: 'Missing transaction table headers' };
  }

  return { valid: true };
}
