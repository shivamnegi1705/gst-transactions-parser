import { Assignee, AccountIdentifier } from '../types';

const STORAGE_KEY = 'gst-assignee-db';

interface AssigneeMappings {
  [assigneeName: string]: AccountIdentifier[];
}

export class AssigneeDatabase {
  private mappings: AssigneeMappings;
  private useLocalStorage: boolean;

  constructor() {
    this.mappings = {};
    this.useLocalStorage = this.checkLocalStorageAvailable();
    this.load();
  }

  private checkLocalStorageAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private load(): void {
    if (!this.useLocalStorage) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.mappings = JSON.parse(raw);
      }
    } catch {
      this.mappings = {};
    }
  }

  private save(): void {
    if (!this.useLocalStorage) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.mappings));
    } catch {
      // silently fall back to in-memory only
    }
  }

  getAssignees(): Assignee[] {
    return Object.entries(this.mappings).map(([name, accounts]) => ({
      name,
      accounts,
    }));
  }

  getAccountsByAssignee(assigneeName: string): AccountIdentifier[] {
    return this.mappings[assigneeName] ?? [];
  }

  addMapping(assigneeName: string, accountId: AccountIdentifier): void {
    if (!this.mappings[assigneeName]) {
      this.mappings[assigneeName] = [];
    }
    const exists = this.mappings[assigneeName].some(
      (a) =>
        a.accountNumber === accountId.accountNumber &&
        a.accountName === accountId.accountName
    );
    if (!exists) {
      this.mappings[assigneeName].push(accountId);
      this.save();
    }
  }

  isLocalStorageAvailable(): boolean {
    return this.useLocalStorage;
  }

  removeMapping(assigneeName: string, accountId: AccountIdentifier): void {
    if (!this.mappings[assigneeName]) return;
    this.mappings[assigneeName] = this.mappings[assigneeName].filter(
      (a) =>
        a.accountNumber !== accountId.accountNumber ||
        a.accountName !== accountId.accountName
    );
    if (this.mappings[assigneeName].length === 0) {
      delete this.mappings[assigneeName];
    }
    this.save();
  }
}
