import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ClipboardList, Filter, X, ArrowUpRight, ArrowDownRight, IndianRupee, Check, Clock, Paperclip, Eye, Download } from 'lucide-react';
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
  'Other Expense'
];

export const Ledger: React.FC<LedgerProps> = ({
  vehicles,
  transactions,
  selectedVehicleId,
  setSelectedVehicleId,
  refreshData
}) => {
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTx, setCurrentTx] = useState<Transaction | null>(null);

  // Form states
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txCategory, setTxCategory] = useState<TransactionCategory>('Freight Booking');
  const [txAmount, setTxAmount] = useState('');
  const [txPaymentMode, setTxPaymentMode] = useState<'Cash' | 'Bank' | 'UPI' | 'Pending'>('Cash');
  const [txDescription, setTxDescription] = useState('');
  const [txEvidence, setTxEvidence] = useState<string>('');
  const [txEvidenceName, setTxEvidenceName] = useState<string>('');

  // Preview overlay states
  const [previewEvidence, setPreviewEvidence] = useState<string | null>(null);
  const [previewEvidenceName, setPreviewEvidenceName] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterType, setFilterType] = useState<'All' | 'Credit' | 'Debit' | 'Pending'>('All');

  // Sync category state when txType changes in modal
  useEffect(() => {
    if (txType === 'income') {
      setTxCategory(INCOME_CATEGORIES[0]);
    } else {
      setTxCategory(EXPENSE_CATEGORIES[0]);
    }
  }, [txType]);

  const resetForm = () => {
    setTxType('income');
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxCategory('Freight Booking');
    setTxAmount('');
    setTxPaymentMode('Cash');
    setTxDescription('');
    setTxEvidence('');
    setTxEvidenceName('');
  };

  const handleEvidenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // 1MB limit
      alert("File size exceeds 1MB limit. Please upload a smaller receipt or invoice to save storage space.");
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        setTxEvidence(result);
        setTxEvidenceName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAddModal = (type: 'income' | 'expense') => {
    setTxType(type);
    setIsAddModalOpen(true);
  };

  const handleOpenAddModalPending = () => {
    setTxPaymentMode('Pending');
    setIsAddModalOpen(true);
  };

  const handleClearPending = async (tx: Transaction) => {
    const mode = window.prompt('Enter cleared payment mode (Cash / Bank / UPI):', 'Cash');
    if (!mode) return;
    const cleanMode = mode.trim();
    const upperMode = cleanMode.toUpperCase();
    if (upperMode === 'CASH' || upperMode === 'BANK' || upperMode === 'UPI') {
      let finalMode: 'Cash' | 'Bank' | 'UPI' = 'Cash';
      if (upperMode === 'BANK') finalMode = 'Bank';
      if (upperMode === 'UPI') finalMode = 'UPI';

      await updateTransaction({
        ...tx,
        paymentMode: finalMode,
        wasPending: true
      });
      refreshData();
    } else {
      alert('Invalid payment mode! Please enter Cash, Bank, or UPI.');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId || !txAmount) return;

    await addTransaction({
      vehicleId: selectedVehicleId,
      date: txDate,
      type: txType,
      category: txCategory,
      amount: parseFloat(txAmount),
      paymentMode: txPaymentMode,
      description: txDescription.trim(),
      evidence: txEvidence || undefined,
      evidenceName: txEvidenceName || undefined
    });

    resetForm();
    setIsAddModalOpen(false);
    refreshData();
  };

  const handleOpenEditModal = (tx: Transaction) => {
    setCurrentTx(tx);
    setTxType(tx.type);
    setTxDate(tx.date);
    setTxCategory(tx.category);
    setTxAmount(tx.amount.toString());
    setTxPaymentMode(tx.paymentMode);
    setTxDescription(tx.description);
    setTxEvidence(tx.evidence || '');
    setTxEvidenceName(tx.evidenceName || '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTx || !txAmount) return;

    const isNowCleared = currentTx.paymentMode === 'Pending' && txPaymentMode !== 'Pending';
    const isNowPending = txPaymentMode === 'Pending';

    await updateTransaction({
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
    });

    resetForm();
    setIsEditModalOpen(false);
    setCurrentTx(null);
    refreshData();
  };

  const handleDeleteTx = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this ledger entry?');
    if (confirmed) {
      await deleteTransaction(id);
      refreshData();
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

            <div className="ledger-actions">
              <button className="btn btn-success" onClick={() => handleOpenAddModal('income')}>
                <Plus size={18} />
                Add Income
              </button>
              <button className="btn btn-primary" onClick={() => handleOpenAddModal('expense')}>
                <Plus size={18} />
                Add Cost / Expense
              </button>
              <button className="btn" style={{ backgroundColor: 'var(--color-warning)', color: 'black' }} onClick={handleOpenAddModalPending}>
                <Plus size={18} />
                Add Pending
              </button>
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
                      <th>Date</th>
                      <th>Category</th>
                      <th>Payment Mode</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'center', width: '100px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxs.map(t => (
                      <tr key={t.id}>
                        <td>{t.date}</td>
                        <td>
                          <span className={`badge ${t.type === 'income' ? 'success' : 'danger'}`}>
                            {t.category}
                          </span>
                        </td>
                        <td>
                          {t.paymentMode === 'Pending' ? (
                            <span className="badge warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} />
                              PENDING
                            </span>
                          ) : (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span>{t.paymentMode}</span>
                              {t.wasPending && (
                                <span 
                                  className="badge success" 
                                  style={{ 
                                    fontSize: '0.65rem', 
                                    padding: '2px 6px', 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '2px', 
                                    background: 'var(--color-success-bg)',
                                    color: 'var(--color-success)',
                                    border: '1px solid rgba(16, 185, 129, 0.2)'
                                  }}
                                  title="Originally Pending, now Cleared"
                                >
                                  <Check size={8} />
                                  CLEARED
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span>{t.description || '-'}</span>
                            {t.evidence && (
                              <button 
                                className="btn btn-secondary btn-sm" 
                                style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => {
                                  setPreviewEvidence(t.evidence || null);
                                  setPreviewEvidenceName(t.evidenceName || null);
                                }}
                                title={`View Attached Bill: ${t.evidenceName}`}
                              >
                                <Paperclip size={12} />
                                Bill
                              </button>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }} className={t.type === 'income' ? 'amount-income' : 'amount-expense'}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            {t.paymentMode === 'Pending' && (
                              <button 
                                className="btn btn-success btn-sm" 
                                style={{ padding: '6px 10px', background: 'var(--color-success)', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '4px' }} 
                                onClick={() => handleClearPending(t)} 
                                title="Clear payment / Mark paid"
                              >
                                <Check size={12} />
                                Clear
                              </button>
                            )}
                            <button className="btn btn-secondary btn-sm" style={{ padding: '6px' }} onClick={() => handleOpenEditModal(t)} title="Edit">
                              <Edit2 size={12} />
                            </button>
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

                <div className="form-group">
                  <label className="form-label">Description / Remarks</label>
                  <textarea 
                    className="form-control" 
                    style={{ height: '80px', resize: 'vertical' }}
                    placeholder="Enter trip details, petrol bunk name, driver allowances, etc."
                    value={txDescription}
                    onChange={e => setTxDescription(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Evidence / Receipt File (Optional - Max 1MB)</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input 
                      type="file" 
                      className="form-control" 
                      accept="image/*,application/pdf"
                      onChange={handleEvidenceFileChange}
                      style={{ flexGrow: 1 }}
                    />
                    {txEvidence && (
                      <button 
                        type="button" 
                        className="btn btn-outline-danger" 
                        onClick={() => { setTxEvidence(''); setTxEvidenceName(''); }}
                        title="Remove attached file"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {txEvidence && (
                    <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check size={14} />
                      Attached: <strong>{txEvidenceName}</strong>
                    </div>
                  )}
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

                <div className="form-group">
                  <label className="form-label">Description / Remarks</label>
                  <textarea 
                    className="form-control" 
                    style={{ height: '80px', resize: 'vertical' }}
                    placeholder="Enter trip details..."
                    value={txDescription}
                    onChange={e => setTxDescription(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Evidence / Receipt File (Optional - Max 1MB)</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input 
                      type="file" 
                      className="form-control" 
                      accept="image/*,application/pdf"
                      onChange={handleEvidenceFileChange}
                      style={{ flexGrow: 1 }}
                    />
                    {txEvidence && (
                      <button 
                        type="button" 
                        className="btn btn-outline-danger" 
                        onClick={() => { setTxEvidence(''); setTxEvidenceName(''); }}
                        title="Remove attached file"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {txEvidence && (
                    <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check size={14} />
                      Attached: <strong>{txEvidenceName}</strong>
                    </div>
                  )}
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

      {/* Evidence Preview Modal */}
      {previewEvidence && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Eye size={20} className="amount-income" />
                Evidence Preview: {previewEvidenceName}
              </h3>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '6px' }} 
                onClick={() => { setPreviewEvidence(null); setPreviewEvidenceName(null); }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#07080c', minHeight: '200px' }}>
              {previewEvidence.startsWith('data:image/') ? (
                <img 
                  src={previewEvidence} 
                  alt="Attachment Receipt" 
                  style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '4px' }} 
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Paperclip size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>PDF or other binary document preview is not supported directly in local sandbox.</p>
                  <a 
                    href={previewEvidence} 
                    download={previewEvidenceName || 'evidence'} 
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Download size={16} />
                    Download File to View
                  </a>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => { setPreviewEvidence(null); setPreviewEvidenceName(null); }}
              >
                Close
              </button>
              {previewEvidence.startsWith('data:image/') && (
                <a 
                  href={previewEvidence} 
                  download={previewEvidenceName || 'receipt'} 
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Download size={16} />
                  Download receipt
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
