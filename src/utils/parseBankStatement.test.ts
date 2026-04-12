import { describe, it, expect } from 'vitest';
import { parseBankStatement } from './parseBankStatement';
import type { ParseError } from '../types';

const VALID_STATEMENT = `
Account: 12345678 - John Doe
Date        Description        Amount
01/01/2024  Grocery Store      -50.00
02/01/2024  Salary             3000.00

Account: 87654321 - Jane Smith
Date        Description        Amount
01/01/2024  Rent               -1500.00
03/01/2024  Freelance Work     2000.00
`.trim();

describe('parseBankStatement', () => {
  it('extracts statement period from first and last dates', () => {
    const result = parseBankStatement(VALID_STATEMENT);
    expect(result.statementPeriod.startDate).toBe('01/01/2024');
    expect(result.statementPeriod.endDate).toBe('03/01/2024');
  });

  it('groups transactions by account identifier', () => {
    const result = parseBankStatement(VALID_STATEMENT);
    expect(result.transactionGroups).toHaveLength(2);

    const group1 = result.transactionGroups[0];
    expect(group1.account.accountNumber).toBe('12345678');
    expect(group1.account.accountName).toBe('John Doe');
    expect(group1.transactions).toHaveLength(2);

    const group2 = result.transactionGroups[1];
    expect(group2.account.accountNumber).toBe('87654321');
    expect(group2.account.accountName).toBe('Jane Smith');
    expect(group2.transactions).toHaveLength(2);
  });

  it('extracts transaction details correctly', () => {
    const result = parseBankStatement(VALID_STATEMENT);
    const tx = result.transactionGroups[0].transactions[0];
    expect(tx.date).toBe('01/01/2024');
    expect(tx.description).toBe('Grocery Store');
    expect(tx.amount).toBe(-50);
  });

  it('handles single account with single transaction', () => {
    const text = `Account: 99999999 - Solo User
Date        Description        Amount
15/06/2024  Payment            100.00`;
    const result = parseBankStatement(text);
    expect(result.transactionGroups).toHaveLength(1);
    expect(result.transactionGroups[0].transactions).toHaveLength(1);
    expect(result.transactionGroups[0].transactions[0].amount).toBe(100);
  });

  it('throws ParseError for empty input', () => {
    try {
      parseBankStatement('');
      expect.fail('Should have thrown');
    } catch (err) {
      const parseErr = err as ParseError;
      expect(parseErr.message).toBeTruthy();
      expect(parseErr.location).toBeTruthy();
    }
  });

  it('throws ParseError when no account sections found', () => {
    try {
      parseBankStatement('Some random text without accounts');
      expect.fail('Should have thrown');
    } catch (err) {
      const parseErr = err as ParseError;
      expect(parseErr.message).toContain('No account sections found');
      expect(parseErr.location).toBe('document');
    }
  });

  it('throws ParseError for transaction before account header', () => {
    const text = `01/01/2024  Orphan Transaction  100.00
Account: 12345678 - John Doe
Date        Description        Amount
02/01/2024  Salary             3000.00`;
    try {
      parseBankStatement(text);
      expect.fail('Should have thrown');
    } catch (err) {
      const parseErr = err as ParseError;
      expect(parseErr.message).toContain('Transaction found before any account header');
      expect(parseErr.location).toMatch(/line \d+/);
    }
  });

  it('handles YYYY-MM-DD date format', () => {
    const text = `Account: 12345678 - John Doe
Date        Description        Amount
2024-01-01  Grocery Store      -50.00`;
    const result = parseBankStatement(text);
    expect(result.transactionGroups[0].transactions[0].date).toBe('2024-01-01');
    expect(result.statementPeriod.startDate).toBe('2024-01-01');
  });

  it('handles DD-MM-YYYY date format', () => {
    const text = `Account: 12345678 - John Doe
Date        Description        Amount
01-01-2024  Grocery Store      -50.00`;
    const result = parseBankStatement(text);
    expect(result.transactionGroups[0].transactions[0].date).toBe('01-01-2024');
  });

  it('preserves all transactions across groups', () => {
    const result = parseBankStatement(VALID_STATEMENT);
    const totalTx = result.transactionGroups.reduce(
      (sum, g) => sum + g.transactions.length,
      0
    );
    expect(totalTx).toBe(4);
  });
});
