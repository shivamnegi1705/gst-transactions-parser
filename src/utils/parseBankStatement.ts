import type {
  ParseResult,
  ParseError,
  StatementPeriod,
  TransactionGroup,
  AccountIdentifier,
  Transaction,
} from '../types';

/** Regex for date patterns: DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD */
const DATE_PATTERN =
  /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})\b/g;

/** Regex for simple account header lines like "Account: 12345678 - John Doe" */
const SIMPLE_ACCOUNT_HEADER =
  /Account:\s*(\d{8,})\s*-\s*(.+)/i;

/** Regex for ICICI-style account header: "Statement of Transactions in ... Account Number: 025501531533" */
const ICICI_ACCOUNT_HEADER =
  /Statement\s+of\s+Transactions\s+in\s+(\w+)\s+Account\s+Number:\s*(\d{8,})/i;

/** Regex for ICICI-style period: "for the period February 01, 2026 - February 28, 2026" */
const ICICI_PERIOD_PATTERN =
  /for\s+the\s+period\s+(\w+\s+\d{1,2},?\s+\d{4})\s*[-–]\s*(\w+\s+\d{1,2},?\s+\d{4})/i;

/** Regex for simple transaction lines like "01/01/2024  Grocery Store  -50.00" */
const SIMPLE_TRANSACTION_LINE =
  /^(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})\s+(.+?)\s+([-]?\d+(?:\.\d+)?)\s*$/;

/** Parse Indian comma-formatted number like "1,82,196.96" or "239.02" */
function parseIndianNumber(str: string): number {
  return parseFloat(str.replace(/,/g, ''));
}

/**
 * Extracts the statement period from the PDF text.
 * Tries ICICI explicit period first, then falls back to first/last date.
 */
function extractStatementPeriod(pdfText: string): StatementPeriod {
  // Try ICICI explicit period
  const iciciMatch = pdfText.match(ICICI_PERIOD_PATTERN);
  if (iciciMatch) {
    return { startDate: iciciMatch[1]?.trim() ?? 'Unknown', endDate: iciciMatch[2]?.trim() ?? 'Unknown' };
  }

  // Fallback: first and last date in text
  const matches = pdfText.match(DATE_PATTERN) || [];
  const startDate = matches[0] ?? 'Unknown';
  const endDate = matches.length > 1 ? (matches[matches.length - 1] ?? 'Unknown') : startDate;
  return { startDate, endDate };
}

/** Detect whether the text looks like an ICICI bank statement */
function isIciciFormat(pdfText: string): boolean {
  return ICICI_ACCOUNT_HEADER.test(pdfText);
}

/**
 * Extract account holder name from ICICI statement.
 * Looks for "MR." or "MRS." or "MS." prefixed name near the top.
 */
function extractIciciAccountName(pdfText: string): string {
  const nameMatch = pdfText.match(/\b(MR\.|MRS\.|MS\.)\s*([A-Z\s]+)/);
  if (nameMatch) {
    return (nameMatch[1] + nameMatch[2]).trim();
  }
  return 'Account Holder';
}

/**
 * Parse ICICI-format bank statement.
 * In the PDF text (after Y-coordinate line splitting), transactions typically appear as:
 *   - A line with just the date: "01-02-2026"
 *   - One or more lines of description: "UPI/ZEPTO MARK/zeptomarketpla/UPI/AXIS"
 *   - A line with amounts: "239.02 2,22,196.96" (withdrawal + balance) or "1,600.00 1,64,733.96" (deposit + balance)
 * OR sometimes the date and some text are on the same line:
 *   - "18-02-2026 ACH/KPIT TECHNOLOGIES/5474901 103.50 1,64,865.37"
 */
function parseIciciStatement(pdfText: string): ParseResult {
  const statementPeriod = extractStatementPeriod(pdfText);

  const accountMatch = pdfText.match(ICICI_ACCOUNT_HEADER);
  if (!accountMatch) {
    throw { message: 'No account sections found in the bank statement', location: 'document' } as ParseError;
  }

  const accountNumber = accountMatch[2];
  const accountName = extractIciciAccountName(pdfText);
  const account: AccountIdentifier = { accountNumber, accountName };

  const lines = pdfText.split('\n');
  const rawTransactions: { date: string; description: string; txAmount: number; balance: number }[] = [];

  const dateLinePattern = /^(\d{2}-\d{2}-\d{4})(.*)$/;
  const amountPattern = /[\d,]+\.\d{2}/g;

  // Track whether we're past the transaction table header
  let inTransactionTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect start of transaction table
    if (/^date\b/i.test(line) && /\b(balance|withdrawals)\b/i.test(line)) {
      inTransactionTable = true;
      continue;
    }

    if (!inTransactionTable) continue;

    // Stop at summary/footer sections
    if (/^total\b/i.test(line)) break;
    if (/^summary\s+of\s+tds/i.test(line)) break;
    if (/^account\s+related/i.test(line)) break;

    // Skip page headers and name lines
    if (/^page\s+\d/i.test(line)) continue;
    if (/^MR\.|^MRS\.|^MS\./i.test(line)) continue;
    if (/^date\b/i.test(line) && /\b(balance|withdrawals)\b/i.test(line)) continue;

    // Check if line starts with a date
    const dateMatch = line.match(dateLinePattern);
    if (!dateMatch) continue;

    const date = dateMatch[1];
    const restOfDateLine = dateMatch[2].trim();

    // Collect all subsequent lines until the next date line or a stop marker
    const blockLines: string[] = [];
    if (restOfDateLine) blockLines.push(restOfDateLine);

    let j = i + 1;
    while (j < lines.length) {
      const nextLine = lines[j].trim();
      if (!nextLine) { j++; continue; }
      if (dateLinePattern.test(nextLine)) break;
      if (/^total\b/i.test(nextLine)) break;
      if (/^page\s+\d/i.test(nextLine)) { j++; continue; }
      if (/^MR\.|^MRS\.|^MS\./i.test(nextLine)) { j++; continue; }
      if (/^date\b/i.test(nextLine) && /\b(balance|withdrawals)\b/i.test(nextLine)) { j++; continue; }
      if (/^summary\s+of\s+tds/i.test(nextLine)) break;
      if (/^account\s+related/i.test(nextLine)) break;
      blockLines.push(nextLine);
      j++;
    }

    const fullBlock = blockLines.join(' ');

    // Skip B/F (brought forward) lines
    if (/\bB\/F\b/.test(fullBlock)) continue;
    if (!fullBlock.trim()) continue;

    // Extract amounts from the block
    const amounts = fullBlock.match(amountPattern);
    if (!amounts || amounts.length === 0) continue;

    // Extract description: everything before the first amount
    const firstAmountIdx = fullBlock.search(/[\d,]+\.\d{2}/);
    let description = fullBlock.substring(0, firstAmountIdx).trim();
    description = description.replace(/\/+$/, '').trim();

    if (!description || description.length < 2) continue;

    const parsedAmounts = amounts.map(parseIndianNumber);

    // The last amount is always the balance
    const balance = parsedAmounts[parsedAmounts.length - 1];
    // The transaction amount is the first amount (before balance)
    const txAmount = parsedAmounts.length >= 2 ? parsedAmounts[0] : parsedAmounts[0];

    rawTransactions.push({ date, description, txAmount, balance });
  }

  // Now determine sign using balance comparison:
  // If balance went up compared to previous, it's a deposit (+)
  // If balance went down, it's a withdrawal (-)
  const transactions: Transaction[] = [];
  for (let k = 0; k < rawTransactions.length; k++) {
    const raw = rawTransactions[k];
    let amount = raw.txAmount;

    if (k > 0) {
      const prevBalance = rawTransactions[k - 1].balance;
      const balanceDiff = raw.balance - prevBalance;
      // If balance decreased, it's a withdrawal (negative)
      // If balance increased, it's a deposit (positive)
      amount = balanceDiff < 0 ? -raw.txAmount : raw.txAmount;
    } else {
      // First transaction: no previous balance to compare
      // Use a heuristic — if there are 3+ amounts in the block, the middle one is withdrawal
      // Otherwise, we can't determine sign reliably; default to negative (most transactions are withdrawals)
      amount = -raw.txAmount;
    }

    transactions.push({ date: raw.date, description: raw.description, amount });
  }

  return {
    statementPeriod,
    transactionGroups: [{ account, transactions }],
  };
}

/**
 * Parse simple format bank statement (original format).
 */
function parseSimpleStatement(pdfText: string): ParseResult {
  const statementPeriod = extractStatementPeriod(pdfText);

  const lines = pdfText.split('\n');
  const transactionGroups: TransactionGroup[] = [];
  let currentAccount: AccountIdentifier | null = null;
  let currentTransactions: Transaction[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;

    // Check for account header
    const accountMatch = line.match(SIMPLE_ACCOUNT_HEADER);
    if (accountMatch) {
      if (currentAccount) {
        transactionGroups.push({
          account: currentAccount,
          transactions: currentTransactions,
        });
      }
      currentAccount = {
        accountNumber: accountMatch[1],
        accountName: accountMatch[2].trim(),
      };
      currentTransactions = [];
      continue;
    }

    // Skip table header lines
    if (/^date\b/i.test(line) && /\b(amount|balance)\b/i.test(line)) {
      continue;
    }

    // Try to parse as a transaction line
    const txMatch = line.match(SIMPLE_TRANSACTION_LINE);
    if (txMatch) {
      if (!currentAccount) {
        throw { message: 'Transaction found before any account header', location: `line ${i + 1}` } as ParseError;
      }
      currentTransactions.push({
        date: txMatch[1],
        description: txMatch[2].trim(),
        amount: parseFloat(txMatch[3]),
      });
      continue;
    }

    // Non-empty line that doesn't match — only throw for suspicious data lines
    if (currentAccount && line.length > 0 && !/^[-=]+$/.test(line)) {
      if (/\d/.test(line) && !/^(date|description|amount|particulars)/i.test(line)) {
        throw { message: `Malformed transaction line: "${line}"`, location: `line ${i + 1}` } as ParseError;
      }
    }
  }

  if (currentAccount) {
    transactionGroups.push({
      account: currentAccount,
      transactions: currentTransactions,
    });
  }

  if (transactionGroups.length === 0) {
    throw { message: 'No account sections found in the bank statement', location: 'document' } as ParseError;
  }

  return { statementPeriod, transactionGroups };
}

/**
 * Parses extracted PDF text into structured transaction data.
 * Supports both simple format and ICICI bank statement format.
 */
export function parseBankStatement(pdfText: string): ParseResult {
  if (!pdfText || pdfText.trim().length === 0) {
    throw { message: 'Empty or blank PDF text provided', location: 'input' } as ParseError;
  }

  if (isIciciFormat(pdfText)) {
    return parseIciciStatement(pdfText);
  }

  return parseSimpleStatement(pdfText);
}
