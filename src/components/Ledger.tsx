import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ClipboardList, Filter, X, ArrowUpRight, ArrowDownRight, IndianRupee } from 'lucide-react';
import type { Vehicle, Transaction, TransactionCategory } from '../types';
import { 
  addTransaction, 
  updateTransaction, 
  deleteTransaction
} from '../utils/storage';

interface LedgerProps {
  vehicles: Vehicle[];
  transactions: Transaction[];
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string | null) => void;
  refreshData: () => void;
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

const INCOME_CATEGORIES: TransactionCategory[] = [
  'Freight Booking',
  'Loading/Unloading',
  'Demurrage (Waiting Charges)',
  'Other Income'
];

const EXPENSE_CATEGORIES: TransactionCategory[] = [
  'Diesel / Fuel',
  'Toll Charges',
  'Driver Salary / Batta',
  'Maintenance & Repairs',
  'Tyre Expense',
  'RTO / Challan / Fine',
  'Insurance / Tax / Permit',
  'Loading/Unloading Labour',
  'Office/Admin Expense',
  'Other Expense',
  'Fuel (Diesel)',
  'Driver Charge / Salary',
  'Loading Charge',
  'Toll Tax',
  'Way Bridge Charge',
  'Other Fixed Charge',
  'Puncture Repair',
  'Air Filling',
  'General Service',
  'Washing',
  'Oil Change',
  'Battery',
  'Tyre Repair / Replacement',
  'Spare Parts',
  'Mechanical Repair',
  'Other Maintenance'
];

export const Ledger: React.FC<LedgerProps> = ({
  vehicles,
  transactions,
  selectedVehicleId,
  setSelectedVehicleId,
  refreshData,
  setTransactions
}) => {
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTx, setCurrentTx] = useState<Transaction | null>(null);

  // Form states
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txCategory, setTxCategory] = useState<TransactionCategory | ''>('');
  const [txAmount, setTxAmount] = useState('');
  const [txPaymentMode, setTxPaymentMode] = useState<'Cash' | 'Bank' | 'UPI' | 'Pending' | 'Check' | 'Online'>('Cash');
  const [txDescription, setTxDescription] = useState('');
  const [txEvidence, setTxEvidence] = useState<string>('');
  const [txEvidenceName, setTxEvidenceName] = useState<string>('');

  const [txFrom, setTxFrom] = useState('');
  const [txTo, setTxTo] = useState('');
  const [txWeight, setTxWeight] = useState('');
  const [txRate, setTxRate] = useState('');
  const [txPartyName, setTxPartyName] = useState('');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterType, setFilterType] = useState<'All' | 'Credit' | 'Debit' | 'Pending'>('All');

  // Sync category state when txType changes in modal
  useEffect(() => {
    setTxCategory('');
  }, [txType]);

  // Auto-calculate amount when weight or rate changes in Ledger modal
  useEffect(() => {
    const w = Number(txWeight);
    const r = Number(txRate);
    if (w > 0 && r > 0) {
      setTxAmount((w * r).toString());
    }
  }, [txWeight, txRate]);

  const resetForm = () => {
    setTxType('income');
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxCategory('');
    setTxAmount('');
    setTxPaymentMode('Cash');
    setTxDescription('');
    setTxEvidence('');
    setTxEvidenceName('');
    setTxFrom('');
    setTxTo('');
    setTxWeight('');
    setTxRate('');
    setTxPartyName('');
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId || !txCategory || !txAmount) {
      alert("Please ensure all required fields are filled, including Category.");
      return;
    }

    await addTransaction({
      vehicleId: selectedVehicleId,
      date: txDate,
      type: txType,
      category: txCategory,
      amount: parseFloat(txAmount),
      paymentMode: txPaymentMode,
      description: txDescription.trim(),
      evidence: txEvidence || undefined,
      evidenceName: txEvidenceName || undefined,
      from: txType === 'income' ? txFrom : undefined,
      to: txType === 'income' ? txTo : undefined,
      weight: txType === 'income' && txWeight ? Number(txWeight) : undefined,
      rate: txType === 'income' && txRate ? Number(txRate) : undefined,
      partyName: txType === 'expense' ? txPartyName.trim() || undefined : undefined
    });

    resetForm();
    setIsAddModalOpen(false);
    refreshData();
  };


  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTx || !txCategory || !txAmount) {
      alert("Please ensure all required fields are filled, including Category.");
      return;
    }

    const isNowCleared = currentTx.paymentMode === 'Pending' && txPaymentMode !== 'Pending';
    const isNowPending = txPaymentMode === 'Pending';

    const updatedTx = {
      ...currentTx,
      date: txDate,
      type: txType,
      category: txCategory,
      amount: parseFloat(txAmount),
      paymentMode: txPaymentMode,
      description: txDescription.trim(),
      evidence: txEvidence || undefined,
      evidenceName: txEvidenceName || undefined,
      wasPending: isNowPending ? false : (isNowCleared ? true : currentTx.wasPending)
    };

    if (setTransactions) {
      setTransactions(prev => prev.map(item => item.id === currentTx.id ? updatedTx : item));
    }

    resetForm();
    setIsEditModalOpen(false);
    setCurrentTx(null);
    updateTransaction(updatedTx).then(() => {
      refreshData();
    });
  };

  const handleDeleteTx = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this ledger entry?');
    if (confirmed) {
      if (setTransactions) {
        setTransactions(prev => prev.filter(item => item.id !== id));
      }
      deleteTransaction(id).then(() => {
        refreshData();
      });
    }
  };

  // Get active vehicle details and ledger transactions
  const activeVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const rawLedgerTxs = selectedVehicleId ? transactions.filter(t => t.vehicleId === selectedVehicleId) : [];

  // Custom ledger summary calculations
  let totalIncomeWithPending = 0;
  let clearedIncomeOnly = 0;
  let totalExpense = 0;
  let clearedExpenseOnly = 0;

  rawLedgerTxs.forEach(t => {
    if (t.type === 'income') {
      totalIncomeWithPending += t.amount;
      if (t.paymentMode !== 'Pending') {
        clearedIncomeOnly += t.amount;
      }
    } else {
      totalExpense += t.amount;
      if (t.paymentMode !== 'Pending') {
        clearedExpenseOnly += t.amount;
      }
    }
  });

  const clearedBalance = clearedIncomeOnly - clearedExpenseOnly;

  // Filter transactions
  const filteredTxs = rawLedgerTxs.filter(t => {
    const dateMatch = (!startDate || t.date >= startDate) && (!endDate || t.date <= endDate);
    const categoryMatch = filterCategory === 'All' || t.category === filterCategory;
    
    let typeMatch = true;
    if (filterType === 'Credit') {
      typeMatch = t.type === 'income';
    } else if (filterType === 'Debit') {
      typeMatch = t.type === 'expense';
    } else if (filterType === 'Pending') {
      typeMatch = t.paymentMode === 'Pending';
    }
    
    return dateMatch && categoryMatch && typeMatch;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Ledger Accounts</h1>
          <p className="page-subtitle">Select a vehicle to view credit/debit records, filter dates, and manage account items.</p>
        </div>
      </div>

      {/* Vehicle Selector */}
      <div className="card" style={{ padding: '20px' }}>
        <div className="vehicle-select-container">
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Select Vehicle:</span>
          <select 
            className="form-select" 
            style={{ maxWidth: '300px', display: 'inline-block' }}
            value={selectedVehicleId || ''}
            onChange={(e) => setSelectedVehicleId(e.target.value || null)}
          >
            <option value="">-- Choose Vehicle Number --</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.driverName})</option>
            ))}
          </select>
          {activeVehicle && (
            <span style={{ color: 'var(--text-muted)' }}>
              Type: <strong>{activeVehicle.type}</strong> | Driver: <strong>{activeVehicle.driverName}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Ledger Workspace */}
      {!selectedVehicleId ? (
        <div className="empty-state">
          <ClipboardList className="empty-state-icon" size={60} />
          <div className="empty-state-title">Select a Vehicle to Load Ledger</div>
          <p className="empty-state-desc">Choose a vehicle from the dropdown above to manage income bookings and driver/fuel expenses.</p>
        </div>
      ) : (
        <>
          {/* Individual Vehicle Summaries */}
          <div className="stats-grid">
            <div className="card stat-card success" style={{ padding: '16px 20px' }}>
              <div className="stat-icon-wrapper">
                <ArrowUpRight size={20} />
              </div>
              <div className="stat-details">
                <span className="stat-label" style={{ fontSize: '0.75rem' }}>Total Income (With Pending)</span>
                <span className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(totalIncomeWithPending)}</span>
              </div>
            </div>

            <div className="card stat-card success" style={{ padding: '16px 20px', borderLeft: '3px solid var(--color-success)' }}>
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
                <ArrowUpRight size={20} />
              </div>
              <div className="stat-details">
                <span className="stat-label" style={{ fontSize: '0.75rem' }}>Cleared Income (Received Cash)</span>
                <span className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(clearedIncomeOnly)}</span>
              </div>
            </div>

            <div className="card stat-card danger" style={{ padding: '16px 20px' }}>
              <div className="stat-icon-wrapper">
                <ArrowDownRight size={20} />
              </div>
              <div className="stat-details">
                <span className="stat-label" style={{ fontSize: '0.75rem' }}>Vehicle Expenses</span>
                <span className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(totalExpense)}</span>
              </div>
            </div>

            <div className={`card stat-card ${clearedBalance >= 0 ? 'success' : 'danger'}`} style={{ padding: '16px 20px' }}>
              <div className="stat-icon-wrapper" style={{ backgroundColor: clearedBalance >= 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', color: clearedBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                <IndianRupee size={20} />
              </div>
              <div className="stat-details">
                <span className="stat-label" style={{ fontSize: '0.75rem' }}>Net Cash Balance (In Hand)</span>
                <span className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(clearedBalance)}</span>
              </div>
            </div>
          </div>


          {/* Action and Filter Bars */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div className="filter-bar" style={{ margin: 0, flexGrow: 1 }}>
              <div className="filter-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>From Date</label>
                <input type="date" className="form-control" style={{ padding: '8px 12px', fontSize: '0.85rem' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="filter-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>To Date</label>
                <input type="date" className="form-control" style={{ padding: '8px 12px', fontSize: '0.85rem' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div className="filter-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Category</label>
                <select 
                  className="form-select" 
                  style={{ padding: '8px 12px', fontSize: '0.85rem', width: '180px' }}
                  value={filterCategory} 
                  onChange={e => setFilterCategory(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  <optgroup label="Income">
                    {INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="Expense">
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                </select>
              </div>

              <div className="filter-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Type / Status</label>
                <select 
                  className="form-select" 
                  style={{ padding: '8px 12px', fontSize: '0.85rem', width: '150px' }}
                  value={filterType} 
                  onChange={e => setFilterType(e.target.value as 'All' | 'Credit' | 'Debit' | 'Pending')}
                >
                  <option value="All">All Entries</option>
                  <option value="Credit">Credit (Income)</option>
                  <option value="Debit">Debit (Expenses)</option>
                  <option value="Pending">Pending Dues</option>
                </select>
              </div>
              {(startDate || endDate || filterCategory !== 'All' || filterType !== 'All') && (
                <button 
                  className="btn btn-secondary btn-sm"
                  style={{ height: '38px', display: 'flex', alignItems: 'center' }}
                  onClick={() => { setStartDate(''); setEndDate(''); setFilterCategory('All'); setFilterType('All'); }}
                >
                  Clear Filters
                </button>
              )}
            </div>

          </div>

          {/* Ledger Account Table */}
          <div className="card">
            <h3 className="card-title">Account Statement for {activeVehicle?.vehicleNumber}</h3>
            {filteredTxs.length === 0 ? (
              <div className="empty-state" style={{ border: 'none', padding: '40px' }}>
                <Filter className="empty-state-icon" size={40} />
                <div className="empty-state-title">No matching transactions found</div>
                <p className="empty-state-desc">Try clearing the date filters or add a new entry to get started.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '100px', textAlign: 'center' }}>Date</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Category</th>
                      <th style={{ width: '150px' }}>Party Name</th>
                      <th>From</th>
                      <th>To</th>
                      <th style={{ textAlign: 'center' }}>Wt (Ton)</th>
                      <th style={{ textAlign: 'center' }}>Rate (₹)</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'center' }}>Mode</th>
                      <th>Ref/Desc</th>
                      <th style={{ textAlign: 'center', width: '80px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxs.map(t => (
                      <tr key={t.id}>
                        <td style={{ textAlign: 'center' }}>{formatDate(t.date)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${t.type === 'income' ? 'success' : 'danger'}`}>
                            {t.category}
                          </span>
                        </td>
                        <td>{t.partyName || '-'}</td>
                        <td>{t.from || '-'}</td>
                        <td>{t.to || '-'}</td>
                        <td style={{ textAlign: 'center' }}>{t.weight || '-'}</td>
                        <td style={{ textAlign: 'center' }}>{t.rate ? formatCurrency(t.rate) : '-'}</td>
                        <td style={{ textAlign: 'right' }} className={t.type === 'income' ? 'amount-income' : 'amount-expense'}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </td>
                        <td style={{ textAlign: 'center' }}>{t.paymentMode}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.description || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button className="btn btn-outline-danger btn-sm" style={{ padding: '6px' }} onClick={() => handleDeleteTx(t.id)} title="Delete">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Transaction Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Plus size={20} className={txType === 'income' ? 'amount-income' : 'amount-expense'} />
                Record {txType === 'income' ? 'Income Entry' : 'Cost / Expense Entry'}
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => { setIsAddModalOpen(false); resetForm(); }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ flexGrow: 1 }}>
                    <div className="form-label" style={{ marginBottom: '4px' }}>Target Vehicle</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{activeVehicle?.vehicleNumber}</div>
                  </div>
                  <div>
                    <div className="form-label" style={{ marginBottom: '4px' }}>Transaction Type</div>
                    <span className={`badge ${txType === 'income' ? 'success' : 'danger'}`}>
                      {txType}
                    </span>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={txDate}
                      onChange={e => setTxDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Mode *</label>
                    <select 
                      className="form-select"
                      value={txPaymentMode}
                      onChange={e => setTxPaymentMode(e.target.value as 'Cash' | 'Bank' | 'UPI' | 'Pending')}
                      required
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank Transfer</option>
                      <option value="UPI">UPI / Fastag</option>
                      <option value="Pending">Pending / Unpaid</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select 
                      className="form-select"
                      value={txCategory}
                      onChange={e => setTxCategory(e.target.value as TransactionCategory)}
                      required
                    >
                      <option value="">-- Choose Category --</option>
                      {txType === 'income' 
                        ? INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                        : EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                      }
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount (INR) *</label>
                    <input 
                      type="number" 
                      step="any"
                      min="0"
                      className="form-control" 
                      placeholder="Enter amount"
                      value={txAmount}
                      onChange={e => setTxAmount(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>
                {txType === 'income' && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Origin (From)</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Origin Location" 
                          value={txFrom} 
                          onChange={e => setTxFrom(e.target.value)} 
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Destination (To)</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Destination Location" 
                          value={txTo} 
                          onChange={e => setTxTo(e.target.value)} 
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Weight (Tons)</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          placeholder="Weight in Tons" 
                          value={txWeight} 
                          onChange={e => setTxWeight(e.target.value)} 
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Rate / Ton (₹)</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          placeholder="Rate per Ton" 
                          value={txRate} 
                          onChange={e => setTxRate(e.target.value)} 
                        />
                      </div>
                    </div>
                  </>
                )}
                {txType === 'expense' && (
                  <div className="form-row">
                    <div className="form-group" style={{ flexGrow: 1 }}>
                      <label className="form-label">Party Name (Paid To)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Enter party name (person/company paid)" 
                        value={txPartyName} 
                        onChange={e => setTxPartyName(e.target.value)} 
                      />
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group" style={{ flexGrow: 1 }}>
                    <label className="form-label">Evidence / Ref No. / Description</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ref, check number, UPI ID, or notes" 
                      value={txDescription} 
                      onChange={e => setTxDescription(e.target.value)} 
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsAddModalOpen(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit2 size={20} className={txType === 'income' ? 'amount-income' : 'amount-expense'} />
                Edit Ledger Entry
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => { setIsEditModalOpen(false); resetForm(); setCurrentTx(null); }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ flexGrow: 1 }}>
                    <div className="form-label" style={{ marginBottom: '4px' }}>Target Vehicle</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{activeVehicle?.vehicleNumber}</div>
                  </div>
                  <div>
                    <div className="form-label" style={{ marginBottom: '4px' }}>Transaction Type</div>
                    <select
                      className="form-select"
                      style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                      value={txType}
                      onChange={e => setTxType(e.target.value as 'income' | 'expense')}
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select 
                      className="form-select"
                      value={txCategory}
                      onChange={e => setTxCategory(e.target.value as TransactionCategory)}
                      required
                    >
                      <option value="">-- Choose Category --</option>
                      {txType === 'income' 
                        ? INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                        : EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                      }
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount (INR) *</label>
                    <input 
                      type="number" 
                      step="any"
                      min="0"
                      className="form-control" 
                      placeholder="Enter amount"
                      value={txAmount}
                      onChange={e => setTxAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={txDate}
                      onChange={e => setTxDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsEditModalOpen(false); resetForm(); setCurrentTx(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};
