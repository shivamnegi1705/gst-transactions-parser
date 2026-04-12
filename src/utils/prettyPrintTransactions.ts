import type { ParseResult } from '../types';

/**
 * Formats a ParseResult back into structured text that is compatible
 * with parseBankStatement for round-trip verification.
 *
 * Output format:
 * ```
 * Account: 12345678 - John Doe
 * Date        Description        Amount
 * 01/01/2024  Grocery Store      -50.00
 * 02/01/2024  Salary             3000.00
 *
 * Account: 87654321 - Jane Smith
 * Date        Description        Amount
 * 01/01/2024  Rent               -1500.00
 * ```
 */
export function prettyPrintTransactions(result: ParseResult): string {
  const sections: string[] = [];

  for (const group of result.transactionGroups) {
    const lines: string[] = [];

    lines.push(`Account: ${group.account.accountNumber} - ${group.account.accountName}`);
    lines.push('Date        Description        Amount');

    for (const tx of group.transactions) {
      const amount = tx.amount % 1 === 0
        ? `${tx.amount}.00`
        : tx.amount.toFixed(2);

      lines.push(`${tx.date}  ${tx.description}  ${amount}`);
    }

    sections.push(lines.join('\n'));
  }

  return sections.join('\n\n') + '\n';
}
