import { describe, it, expect } from 'vitest';
import { filterTransactionGroups } from './filterTransactionGroups';
import { AssigneeDatabase } from './AssigneeDatabase';
import { TransactionGroup } from '../types';

function makeGroup(accountNumber: string, accountName: string): TransactionGroup {
  return {
    account: { accountNumber, accountName },
    transactions: [{ date: '2024-01-01', description: 'Test', amount: 100 }],
  };
}

describe('filterTransactionGroups', () => {
  const groups: TransactionGroup[] = [
    makeGroup('1001', 'Alice Smith'),
    makeGroup('1002', 'Bob Jones'),
    makeGroup('1003', 'Alice Wonder'),
    makeGroup('2001', 'Charlie Brown'),
  ];

  it('returns all groups when both queries are empty', () => {
    const db = new AssigneeDatabase();
    const result = filterTransactionGroups(groups, '', '', db);
    expect(result).toEqual(groups);
  });

  it('filters by person name (case-insensitive partial match)', () => {
    const db = new AssigneeDatabase();
    const result = filterTransactionGroups(groups, 'alice', '', db);
    expect(result).toHaveLength(2);
    expect(result.map((g) => g.account.accountName)).toEqual([
      'Alice Smith',
      'Alice Wonder',
    ]);
  });

  it('returns all groups when person name query is whitespace-only', () => {
    const db = new AssigneeDatabase();
    const result = filterTransactionGroups(groups, '   ', '', db);
    expect(result).toEqual(groups);
  });

  it('filters by assignee name using database mappings', () => {
    const db = new AssigneeDatabase();
    db.addMapping('Alice', { accountNumber: '1001', accountName: 'Alice Smith' });
    db.addMapping('Alice', { accountNumber: '1003', accountName: 'Alice Wonder' });

    const result = filterTransactionGroups(groups, '', 'Alice', db);
    expect(result).toHaveLength(2);
    expect(result.map((g) => g.account.accountNumber)).toEqual(['1001', '1003']);
  });

  it('falls back to person name match when assignee has no mapping', () => {
    const db = new AssigneeDatabase();
    const result = filterTransactionGroups(groups, '', 'bob', db);
    expect(result).toHaveLength(1);
    expect(result[0].account.accountName).toBe('Bob Jones');
  });

  it('returns intersection when both filters are active', () => {
    const db = new AssigneeDatabase();
    db.addMapping('Team', { accountNumber: '1001', accountName: 'Alice Smith' });
    db.addMapping('Team', { accountNumber: '1002', accountName: 'Bob Jones' });

    // Person filter matches Alice Smith + Alice Wonder
    // Assignee filter matches Alice Smith + Bob Jones (mapped to "Team")
    // Intersection: Alice Smith only
    const result = filterTransactionGroups(groups, 'alice', 'Team', db);
    expect(result).toHaveLength(1);
    expect(result[0].account.accountName).toBe('Alice Smith');
  });

  it('returns empty array when no groups match', () => {
    const db = new AssigneeDatabase();
    const result = filterTransactionGroups(groups, 'nonexistent', '', db);
    expect(result).toHaveLength(0);
  });

  it('returns empty array when intersection is empty', () => {
    const db = new AssigneeDatabase();
    db.addMapping('OnlyCharlie', { accountNumber: '2001', accountName: 'Charlie Brown' });

    // Person filter matches Alice*, assignee filter matches Charlie
    const result = filterTransactionGroups(groups, 'alice', 'OnlyCharlie', db);
    expect(result).toHaveLength(0);
  });

  it('filters by transaction description when account name does not match', () => {
    const db = new AssigneeDatabase();
    const groupsWithTxns: TransactionGroup[] = [
      {
        account: { accountNumber: '1001', accountName: 'MR.SHIVAM NEGI' },
        transactions: [
          { date: '2024-01-01', description: 'UPI/SONAL G/sonalgowda99', amount: 3100 },
          { date: '2024-01-02', description: 'UPI/Swiggy Ltd/swiggyupi', amount: -551 },
          { date: '2024-01-03', description: 'UPI/GROWW INVE/groww.brk', amount: -20000 },
        ],
      },
    ];

    const result = filterTransactionGroups(groupsWithTxns, 'sonal', '', db);
    expect(result).toHaveLength(1);
    expect(result[0].transactions).toHaveLength(1);
    expect(result[0].transactions[0].description).toContain('SONAL');
  });

  it('returns whole group when account name matches (not just matching txns)', () => {
    const db = new AssigneeDatabase();
    const groupsWithTxns: TransactionGroup[] = [
      {
        account: { accountNumber: '1001', accountName: 'Alice Smith' },
        transactions: [
          { date: '2024-01-01', description: 'Grocery', amount: -50 },
          { date: '2024-01-02', description: 'Salary', amount: 3000 },
        ],
      },
    ];

    const result = filterTransactionGroups(groupsWithTxns, 'alice', '', db);
    expect(result).toHaveLength(1);
    expect(result[0].transactions).toHaveLength(2); // all transactions, not filtered
  });
});
