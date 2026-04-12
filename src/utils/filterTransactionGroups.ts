import { TransactionGroup } from '../types';
import { AssigneeDatabase } from './AssigneeDatabase';

/**
 * Filters transaction groups by person name and/or assignee name.
 *
 * - Person name filter: case-insensitive partial match on account name.
 * - Assignee name filter: looks up mapped AccountIdentifiers from AssigneeDatabase;
 *   if no mapping is found, falls back to person name partial match on account name.
 * - Combined: intersection of both filter results (group must match BOTH).
 * - When both queries are empty, returns all groups.
 */
export function filterTransactionGroups(
  groups: TransactionGroup[],
  personNameQuery: string,
  assigneeNameQuery: string,
  assigneeDb: AssigneeDatabase
): TransactionGroup[] {
  const hasPersonFilter = personNameQuery.trim().length > 0;
  const hasAssigneeFilter = assigneeNameQuery.trim().length > 0;

  if (!hasPersonFilter && !hasAssigneeFilter) {
    return groups;
  }

  const personFiltered = hasPersonFilter
    ? filterByPersonName(groups, personNameQuery)
    : groups;

  const assigneeFiltered = hasAssigneeFilter
    ? filterByAssigneeName(groups, assigneeNameQuery, assigneeDb)
    : groups;

  if (hasPersonFilter && hasAssigneeFilter) {
    return intersect(personFiltered, assigneeFiltered);
  }

  return hasPersonFilter ? personFiltered : assigneeFiltered;
}

function filterByPersonName(
  groups: TransactionGroup[],
  query: string
): TransactionGroup[] {
  const lowerQuery = query.toLowerCase();
  const result: TransactionGroup[] = [];

  for (const group of groups) {
    // If account name matches, include the whole group
    if (group.account.accountName.toLowerCase().includes(lowerQuery)) {
      result.push(group);
      continue;
    }

    // Otherwise, check individual transaction descriptions
    const matchingTxns = group.transactions.filter((tx) =>
      tx.description.toLowerCase().includes(lowerQuery)
    );

    if (matchingTxns.length > 0) {
      result.push({
        account: group.account,
        transactions: matchingTxns,
      });
    }
  }

  return result;
}

function filterByAssigneeName(
  groups: TransactionGroup[],
  assigneeQuery: string,
  assigneeDb: AssigneeDatabase
): TransactionGroup[] {
  const mappedAccounts = assigneeDb.getAccountsByAssignee(assigneeQuery);

  if (mappedAccounts.length > 0) {
    return groups.filter((g) =>
      mappedAccounts.some(
        (a) =>
          a.accountNumber === g.account.accountNumber &&
          a.accountName === g.account.accountName
      )
    );
  }

  // Fallback: partial match on account name
  return filterByPersonName(groups, assigneeQuery);
}

function intersect(
  a: TransactionGroup[],
  b: TransactionGroup[]
): TransactionGroup[] {
  return a.filter((groupA) =>
    b.some(
      (groupB) =>
        groupB.account.accountNumber === groupA.account.accountNumber &&
        groupB.account.accountName === groupA.account.accountName
    )
  );
}
