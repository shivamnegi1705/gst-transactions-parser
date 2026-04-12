import { describe, it, expect } from 'vitest';
import { validateBankStatement } from './validateBankStatement';

const VALID_STATEMENT = [
  'Account Number: 12345678',
  'Date        Description        Amount',
  '01/01/2024  Grocery Store      -50.00',
  '02/01/2024  Salary             3000.00',
].join('\n');

describe('validateBankStatement', () => {
  it('returns valid for text with all structural markers', () => {
    expect(validateBankStatement(VALID_STATEMENT)).toEqual({ valid: true });
  });

  it('returns invalid when account number pattern is missing', () => {
    const text = 'Date Description Amount\n01/01/2024 Grocery -50.00';
    const result = validateBankStatement(text);
    expect(result).toEqual({ valid: false, reason: 'No account number pattern found' });
  });

  it('returns invalid when date patterns are missing', () => {
    const text = 'Account: 12345678\nDate Description Amount\nNo dates here';
    const result = validateBankStatement(text);
    expect(result).toEqual({ valid: false, reason: 'No date patterns found' });
  });

  it('returns invalid when transaction table headers are missing', () => {
    const text = 'Account: 12345678\n01/01/2024 some text';
    const result = validateBankStatement(text);
    expect(result).toEqual({ valid: false, reason: 'Missing transaction table headers' });
  });

  it('returns invalid with non-empty reason for empty string', () => {
    const result = validateBankStatement('');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBeTruthy();
    }
  });

  it('accepts dates in DD-MM-YYYY format', () => {
    const text = 'Account: 12345678\nDate Description Amount\n01-01-2024 Test -10';
    expect(validateBankStatement(text)).toEqual({ valid: true });
  });

  it('accepts dates in YYYY-MM-DD format', () => {
    const text = 'Account: 12345678\nDate Description Amount\n2024-01-01 Test -10';
    expect(validateBankStatement(text)).toEqual({ valid: true });
  });

  it('matches table headers case-insensitively', () => {
    const text = 'Account: 12345678\nDATE DESCRIPTION AMOUNT\n01/01/2024 Test -10';
    expect(validateBankStatement(text)).toEqual({ valid: true });
  });

  it('accepts ICICI-style headers with PARTICULARS and WITHDRAWALS', () => {
    const text = 'Account: 025501531533\nDATE MODE** PARTICULARS DEPOSITS WITHDRAWALS BALANCE\n01-02-2026 UPI/Test 239.02 1,82,196.96';
    expect(validateBankStatement(text)).toEqual({ valid: true });
  });
});
