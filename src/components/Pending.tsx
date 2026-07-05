import React, { useState } from 'react';
import { DollarSign, Wallet, CheckCircle2, X } from 'lucide-react';
import type { Vehicle, Transaction } from '../types';
import { addTransactionPayment } from '../utils/storage';

interface PendingProps {
  vehicles: Vehicle[];
  transactions: Transaction[];
  refreshData: () => void;
}

export const Pending: React.FC<PendingProps> = ({ vehicles, transactions, refreshData }) => {
  const [activeTab, setActiveTab] = useState<'receivable' | 'payable'>('receivable');
  
  // Clear Payment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  
  // Payment Form State
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<'Cash' | 'Bank' | 'UPI' | 'Check' | 'Online'>('Cash');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payDesc, setPayDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper formatting functions
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

  // Helper calculations for a transaction
  const getTransactionPaidAmount = (t: Transaction) => {
    if (!t.payments) return 0;
    return t.payments.reduce((sum, p) => sum + p.amount, 0);
  };

  const getTransactionBalance = (t: Transaction) => {
    return t.amount - getTransactionPaidAmount(t);
  };

  const isPendingOrPartial = (t: Transaction) => {
    // If we have explicit paymentStatus
    if (t.paymentStatus) {
      return t.paymentStatus === 'Pending' || t.paymentStatus === 'Partial';
    }
    // Fallback for legacy data
    return t.paymentMode === 'Pending';
  };

  // Filter transactions
  const pendingReceivables = transactions.filter(t => 
    t.type === 'income' && isPendingOrPartial(t)
  );

  const pendingPayables = transactions.filter(t => 
    t.type === 'expense' && isPendingOrPartial(t)
  );

  const currentList = activeTab === 'receivable' ? pendingReceivables : pendingPayables;

  // Modal handlers
  const openClearPayment = (tx: Transaction) => {
    setSelectedTx(tx);
    const balance = getTransactionBalance(tx);
    setPayAmount(balance.toString());
    setPayMode('Cash');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayDesc('');
    setIsModalOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;

    const amount = Number(payAmount);
    const balance = getTransactionBalance(selectedTx);

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (amount > balance) {
      alert(`Payment amount (₹${amount}) cannot exceed the remaining balance (₹${balance}).`);
      return;
    }

    setIsSubmitting(true);
    const res = await addTransactionPayment(selectedTx.id, {
      date: payDate,
      amount,
      paymentMode: payMode,
      description: payDesc.trim()
    });

    setIsSubmitting(false);
    if (res) {
      setIsModalOpen(false);
      setSelectedTx(null);
      refreshData();
    } else {
      alert('Failed to save payment. Please try again.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>Pending Payments</h1>
          <p className="page-subtitle">Track and settle outstanding credit bookings, partial payments, and vendor accounts.</p>
        </div>
      </div>

      {/* Stat Bar */}
      <div className="stats-grid">
        <div className="card stat-card success">
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Receivables Balance</span>
            <span className="stat-value" style={{ color: 'var(--color-success)' }}>
              {formatCurrency(pendingReceivables.reduce((sum, t) => sum + getTransactionBalance(t), 0))}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {pendingReceivables.length} pending incomes
            </span>
          </div>
        </div>

        <div className="card stat-card danger">
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger-text)' }}>
            <Wallet size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Payables Balance</span>
            <span className="stat-value" style={{ color: 'var(--color-danger)' }}>
              {formatCurrency(pendingPayables.reduce((sum, t) => sum + getTransactionBalance(t), 0))}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {pendingPayables.length} pending expenses
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <button 
            className={`btn ${activeTab === 'receivable' ? 'btn-primary' : 'btn-secondary'}`}
            style={activeTab === 'receivable' ? { backgroundColor: 'var(--color-success)', color: '#fff', borderColor: 'var(--color-success)' } : {}}
            onClick={() => setActiveTab('receivable')}
          >
            💰 Amount Receivable ({pendingReceivables.length})
          </button>
          <button 
            className={`btn ${activeTab === 'payable' ? 'btn-primary' : 'btn-secondary'}`}
            style={activeTab === 'payable' ? { backgroundColor: 'var(--color-danger)', color: '#fff', borderColor: 'var(--color-danger)' } : {}}
            onClick={() => setActiveTab('payable')}
          >
            💸 Amount Payable ({pendingPayables.length})
          </button>
        </div>

        {/* List View Table */}
        {currentList.length === 0 ? (
          <div className="empty-state" style={{ border: 'none', padding: '40px' }}>
            <CheckCircle2 className="empty-state-icon" size={50} style={{ color: 'var(--color-success)' }} />
            <div className="empty-state-title">All accounts cleared!</div>
            <p className="empty-state-desc">
              {activeTab === 'receivable' 
                ? 'No outstanding receivable customer dues found for this period.' 
                : 'No outstanding payable vendor/fuel dues found for this period.'}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '110px', textAlign: 'center' }}>Date</th>
                  <th style={{ width: '150px', textAlign: 'center' }}>Vehicle</th>
                  <th style={{ width: '180px' }}>Category</th>
                  <th style={{ width: '160px' }}>Party Name</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>Total Amt</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>Paid</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>Balance Due</th>
                  <th style={{ textAlign: 'center', width: '130px' }}>Status</th>
                  <th style={{ textAlign: 'center', width: '140px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentList.map(t => {
                  const vehicle = vehicles.find(v => v.id === t.vehicleId);
                  const paid = getTransactionPaidAmount(t);
                  const balance = getTransactionBalance(t);
                  const isPartial = paid > 0;
                  
                  return (
                    <tr key={t.id}>
                      <td style={{ textAlign: 'center' }}>{formatDate(t.date)}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {vehicle ? vehicle.vehicleNumber : '-'}
                      </td>
                      <td>{t.category}</td>
                      <td>{t.partyName || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 500 }}>
                        {formatCurrency(t.amount)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--color-success)' }}>
                        {paid > 0 ? formatCurrency(paid) : '₹0'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: activeTab === 'receivable' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {formatCurrency(balance)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${isPartial ? 'warning' : 'danger'}`} style={{ fontSize: '0.7rem' }}>
                          {isPartial ? 'PARTIAL' : 'PENDING'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn btn-primary btn-sm"
                          style={{
                            backgroundColor: activeTab === 'receivable' ? 'var(--color-success)' : 'var(--color-danger)',
                            color: '#fff',
                            fontWeight: 'bold',
                            width: '100%'
                          }}
                          onClick={() => openClearPayment(t)}
                        >
                          Clear Payment
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clear Payment Popup Modal */}
      {isModalOpen && selectedTx && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Wallet size={20} className={activeTab === 'receivable' ? 'amount-income' : 'amount-expense'} />
                Settle Outstanding dues
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => { setIsModalOpen(false); setSelectedTx(null); }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handlePaymentSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Transaction details card */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Vehicle</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                        {vehicles.find(v => v.id === selectedTx.vehicleId)?.vehicleNumber || 'Deleted'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Transaction Type</div>
                      <span className={`badge ${selectedTx.type === 'income' ? 'success' : 'danger'}`}>
                        {selectedTx.type === 'income' ? 'RECEIVABLE' : 'PAYABLE'}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Billing Category</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedTx.category}</div>
                    </div>
                    {selectedTx.partyName && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Party / Vendor</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedTx.partyName}</div>
                      </div>
                    )}
                  </div>

                  {/* Progress Settle Bar */}
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                      <span>Paid: <strong>{formatCurrency(getTransactionPaidAmount(selectedTx))}</strong></span>
                      <span>Total: <strong>{formatCurrency(selectedTx.amount)}</strong></span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${(getTransactionPaidAmount(selectedTx) / selectedTx.amount) * 100}%`,
                          backgroundColor: activeTab === 'receivable' ? 'var(--color-success)' : 'var(--color-danger)'
                        }} 
                      />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, marginTop: '8px', color: activeTab === 'receivable' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      Remaining Balance: {formatCurrency(getTransactionBalance(selectedTx))}
                    </div>
                  </div>
                </div>

                {/* Clear Payment Inputs */}
                <div style={{ fontWeight: 600, fontSize: '0.95rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', color: 'var(--text-primary)' }}>
                  Record Payment Installment
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Payment Date *</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={payDate} 
                      onChange={e => setPayDate(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Mode *</label>
                    <select 
                      className="form-select" 
                      value={payMode} 
                      onChange={e => setPayMode(e.target.value as any)} 
                      required
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="Check">Cheque</option>
                      <option value="Online">Online Payment</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Paying Amount (₹) *</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      step="any"
                      min="1"
                      max={getTransactionBalance(selectedTx)}
                      placeholder="Enter payment amount" 
                      value={payAmount} 
                      onChange={e => setPayAmount(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reference / Evidence details</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Transaction ID / Chq No / Description" 
                      value={payDesc} 
                      onChange={e => setPayDesc(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Payment History section */}
                {selectedTx.payments && selectedTx.payments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Payment History Log ({selectedTx.payments.length})
                    </div>
                    <div className="table-container" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                      <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Mode</th>
                            <th>Ref/Desc</th>
                            <th style={{ textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTx.payments.map((p, idx) => (
                            <tr key={p.id || idx}>
                              <td>{formatDate(p.date)}</td>
                              <td>{p.paymentMode}</td>
                              <td>{p.description || '-'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>
                                {formatCurrency(p.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsModalOpen(false); setSelectedTx(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: activeTab === 'receivable' ? 'var(--color-success)' : 'var(--color-danger)', color: activeTab === 'receivable' ? '#000' : '#fff', fontWeight: 'bold' }} disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : 'Settle Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
