import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useParseResult } from '../context/ParseResultContext';
import { filterTransactionGroups } from '../utils/filterTransactionGroups';
import { AssigneeDatabase } from '../utils/AssigneeDatabase';

function formatAmount(amount: number): string {
  return Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ProcessingPage() {
  const { parseResult } = useParseResult();
  const [personNameQuery, setPersonNameQuery] = useState('');
  const [assigneeNameQuery, setAssigneeNameQuery] = useState('');

  const assigneeDb = useMemo(() => new AssigneeDatabase(), []);
  const assignees = useMemo(() => assigneeDb.getAssignees(), [assigneeDb]);
  const localStorageAvailable = useMemo(() => assigneeDb.isLocalStorageAvailable(), [assigneeDb]);

  const filteredGroups = useMemo(() => {
    if (!parseResult) return [];
    return filterTransactionGroups(
      parseResult.transactionGroups,
      personNameQuery,
      assigneeNameQuery,
      assigneeDb
    );
  }, [parseResult, personNameQuery, assigneeNameQuery, assigneeDb]);

  const totalTransactions = filteredGroups.reduce((sum, g) => sum + g.transactions.length, 0);

  if (!parseResult) {
    return (
      <div className="no-data-page">
        <h1>Statement Processed</h1>
        <p>No statement data available. Please upload a bank statement first.</p>
        <Link to="/" className="back-link">← Upload a statement</Link>
      </div>
    );
  }

  const { statementPeriod } = parseResult;
  const periodUnknown =
    statementPeriod.startDate === 'Unknown' || statementPeriod.endDate === 'Unknown';

  return (
    <div className="processed-page">
      <Link to="/" className="back-link">← Upload another statement</Link>
      <h1>Statement Processed</h1>

      {periodUnknown ? (
        <div className="period-warning" role="alert">
          Could not determine statement date range.
        </div>
      ) : (
        <div className="period-card">
          <span className="label">Period:</span>
          <span className="dates">{statementPeriod.startDate} — {statementPeriod.endDate}</span>
        </div>
      )}

      {!localStorageAvailable && (
        <div className="storage-warning" role="status">
          Local storage unavailable — assignee mappings won't persist between sessions.
        </div>
      )}

      <div className="filters">
        <div className="filter-group">
          <label htmlFor="person-name-filter">Search transactions</label>
          <input
            id="person-name-filter"
            type="text"
            value={personNameQuery}
            onChange={(e) => setPersonNameQuery(e.target.value)}
            placeholder="Search by name or description..."
          />
        </div>
        <div className="filter-group">
          <label htmlFor="assignee-name-filter">Assignee</label>
          <select
            id="assignee-name-filter"
            value={assigneeNameQuery}
            onChange={(e) => setAssigneeNameQuery(e.target.value)}
          >
            <option value="">All assignees</option>
            {assignees.map((assignee) => (
              <option key={assignee.name} value={assignee.name}>
                {assignee.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="empty-state">
          <p>No transactions match your filters.</p>
        </div>
      ) : (
        filteredGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="tx-group">
            <div className="tx-group-header">
              <span className="acc-number">{group.account.accountNumber}</span>
              {group.account.accountName}
            </div>
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {group.transactions.map((txn, txnIndex) => (
                  <tr key={txnIndex}>
                    <td className="date">{txn.date}</td>
                    <td className="description">{txn.description}</td>
                    <td className={`amount ${txn.amount >= 0 ? 'positive' : 'negative'}`}>
                      {txn.amount < 0 ? '−' : '+'} {formatAmount(txn.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="tx-count">
              {group.transactions.length} transaction{group.transactions.length !== 1 ? 's' : ''}
            </div>
          </div>
        ))
      )}

      {totalTransactions > 0 && (
        <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#888', marginTop: '0.5rem' }}>
          Showing {totalTransactions} transaction{totalTransactions !== 1 ? 's' : ''} across {filteredGroups.length} account{filteredGroups.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
