import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssigneeDatabase } from './AssigneeDatabase';

describe('AssigneeDatabase', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty assignees initially', () => {
    const db = new AssigneeDatabase();
    expect(db.getAssignees()).toEqual([]);
  });

  it('returns empty accounts for unknown assignee', () => {
    const db = new AssigneeDatabase();
    expect(db.getAccountsByAssignee('nobody')).toEqual([]);
  });

  it('adds a mapping and retrieves it', () => {
    const db = new AssigneeDatabase();
    const account = { accountNumber: '123', accountName: 'Alice-ICICI' };
    db.addMapping('Alice', account);

    expect(db.getAccountsByAssignee('Alice')).toEqual([account]);
    expect(db.getAssignees()).toEqual([
      { name: 'Alice', accounts: [account] },
    ]);
  });

  it('does not add duplicate mappings', () => {
    const db = new AssigneeDatabase();
    const account = { accountNumber: '123', accountName: 'Alice-ICICI' };
    db.addMapping('Alice', account);
    db.addMapping('Alice', account);

    expect(db.getAccountsByAssignee('Alice')).toHaveLength(1);
  });

  it('adds multiple accounts to the same assignee', () => {
    const db = new AssigneeDatabase();
    const acc1 = { accountNumber: '123', accountName: 'Alice-ICICI' };
    const acc2 = { accountNumber: '456', accountName: 'Alice-HDFC' };
    db.addMapping('Alice', acc1);
    db.addMapping('Alice', acc2);

    expect(db.getAccountsByAssignee('Alice')).toEqual([acc1, acc2]);
  });

  it('removes a mapping', () => {
    const db = new AssigneeDatabase();
    const account = { accountNumber: '123', accountName: 'Alice-ICICI' };
    db.addMapping('Alice', account);
    db.removeMapping('Alice', account);

    expect(db.getAccountsByAssignee('Alice')).toEqual([]);
    expect(db.getAssignees()).toEqual([]);
  });

  it('removes only the specified account from an assignee', () => {
    const db = new AssigneeDatabase();
    const acc1 = { accountNumber: '123', accountName: 'Alice-ICICI' };
    const acc2 = { accountNumber: '456', accountName: 'Alice-HDFC' };
    db.addMapping('Alice', acc1);
    db.addMapping('Alice', acc2);
    db.removeMapping('Alice', acc1);

    expect(db.getAccountsByAssignee('Alice')).toEqual([acc2]);
  });

  it('is a no-op when removing a non-existent mapping', () => {
    const db = new AssigneeDatabase();
    const account = { accountNumber: '123', accountName: 'Alice-ICICI' };
    db.removeMapping('Alice', account);
    expect(db.getAssignees()).toEqual([]);
  });

  it('persists data to localStorage', () => {
    const db1 = new AssigneeDatabase();
    const account = { accountNumber: '123', accountName: 'Alice-ICICI' };
    db1.addMapping('Alice', account);

    // Create a new instance — should load from localStorage
    const db2 = new AssigneeDatabase();
    expect(db2.getAccountsByAssignee('Alice')).toEqual([account]);
  });

  it('falls back to in-memory when localStorage is unavailable', () => {
    const originalSetItem = Storage.prototype.setItem;
    const originalGetItem = Storage.prototype.getItem;
    const originalRemoveItem = Storage.prototype.removeItem;

    // Make localStorage throw on all operations
    Storage.prototype.setItem = vi.fn(() => { throw new Error('no storage'); });
    Storage.prototype.getItem = vi.fn(() => { throw new Error('no storage'); });
    Storage.prototype.removeItem = vi.fn(() => { throw new Error('no storage'); });

    const db = new AssigneeDatabase();
    const account = { accountNumber: '123', accountName: 'Alice-ICICI' };
    db.addMapping('Alice', account);

    expect(db.getAccountsByAssignee('Alice')).toEqual([account]);

    // Restore
    Storage.prototype.setItem = originalSetItem;
    Storage.prototype.getItem = originalGetItem;
    Storage.prototype.removeItem = originalRemoveItem;
  });
});
