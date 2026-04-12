/** Composite key: account number + account name */
export interface AccountIdentifier {
  accountNumber: string;
  accountName: string;
}

/** A single financial transaction */
export interface Transaction {
  date: string;
  description: string;
  amount: number;
}

/** Transactions grouped by account */
export interface TransactionGroup {
  account: AccountIdentifier;
  transactions: Transaction[];
}

/** Date range covered by the bank statement */
export interface StatementPeriod {
  startDate: string;
  endDate: string;
}

/** Output of the parser */
export interface ParseResult {
  statementPeriod: StatementPeriod;
  transactionGroups: TransactionGroup[];
}

/** Assignee-to-account mapping */
export interface Assignee {
  name: string;
  accounts: AccountIdentifier[];
}

/** Discriminated union for validation results */
export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

/** Parser error with location info */
export interface ParseError {
  message: string;
  location?: string;
}
