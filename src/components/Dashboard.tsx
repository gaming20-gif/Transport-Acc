import React, { useState, useEffect } from 'react';
import { Save, Edit2, Trash2, X, Check } from 'lucide-react';
import type { Vehicle, Transaction, TransactionCategory } from '../types';
import { addTransaction, updateTransaction, deleteTransaction } from '../utils/storage';

const FIXED_CATEGORIES: TransactionCategory[] = [
  'Fuel (Diesel)', 'Driver Charge / Salary', 'Loading Charge', 
  'Toll Tax', 'Way Bridge Charge', 'Other Fixed Charge'
];

const MAINTENANCE_CATEGORIES: TransactionCategory[] = [
  'Puncture Repair', 'Air Filling', 'General Service', 'Washing',
  'Oil Change', 'Battery', 'Tyre Repair / Replacement', 'Spare Parts',
  'Mechanical Repair', 'Other Maintenance'
];

interface DashboardProps {
  vehicles: Vehicle[];
  transactions: Transaction[];
  refreshData: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  vehicles, 
  transactions, 
  refreshData
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const today = new Date().toISOString().split('T')[0];

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- INLINE EDIT STATE ---
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editVehicleId, setEditVehicleId] = useState('');
  const [editMaterial, setEditMaterial] = useState('');
  const [editFrom, setEditFrom] = useState('');
  const [editTo, setEditTo] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editRate, setEditRate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPaymentMode, setEditPaymentMode] = useState<any>('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<any>('');
  const [editPartyName, setEditPartyName] = useState('');

  // Auto-calculate editAmount when editWeight or editRate changes
  useEffect(() => {
    if (editingTransactionId) {
      const w = Number(editWeight);
      const r = Number(editRate);
      if (!isNaN(w) && !isNaN(r) && w > 0 && r > 0) {
        setEditAmount((w * r).toString());
      }
    }
  }, [editWeight, editRate]);

  const startEditing = (t: Transaction) => {
    setEditingTransactionId(t.id);
    setEditDate(t.date.split('T')[0]);
    setEditVehicleId(t.vehicleId);
    setEditMaterial(t.material || '');
    setEditFrom(t.from || '');
    setEditTo(t.to || '');
    setEditWeight(t.weight ? t.weight.toString() : '');
    setEditRate(t.rate ? t.rate.toString() : '');
    setEditAmount(t.amount.toString());
    setEditPaymentMode(t.paymentMode);
    setEditDescription(t.description || '');
    setEditCategory(t.category || '');
    setEditPartyName(t.partyName || '');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      await deleteTransaction(id);
      refreshData();
    }
  };

  const handleUpdateIncome = async (t: Transaction) => {
    const amt = Number(editAmount);
    if (!editVehicleId || !editPaymentMode || isNaN(amt) || amt <= 0) {
      alert("Please ensure a vehicle and payment status are selected, and the Total Amount is greater than 0.");
      return;
    }

    await updateTransaction({
      ...t,
      date: editDate,
      vehicleId: editVehicleId,
      material: editMaterial ? editMaterial.trim() : undefined,
      from: editFrom ? editFrom.trim() : undefined,
      to: editTo ? editTo.trim() : undefined,
      weight: editWeight ? Number(editWeight) : undefined,
      rate: editRate ? Number(editRate) : undefined,
      amount: amt,
      paymentMode: editPaymentMode,
      description: editDescription ? editDescription.trim() : ''
    });

    setEditingTransactionId(null);
    refreshData();
  };

  const handleUpdateExpense = async (t: Transaction) => {
    const amt = Number(editAmount);
    if (!editVehicleId || !editCategory || isNaN(amt) || amt <= 0) {
      alert("Please ensure a vehicle, category and Amount are selected, and the Amount is greater than 0.");
      return;
    }

    await updateTransaction({
      ...t,
      date: editDate,
      vehicleId: editVehicleId,
      category: editCategory,
      partyName: editPartyName ? editPartyName.trim() : undefined,
      amount: amt,
      paymentMode: editPaymentMode,
      description: editDescription ? editDescription.trim() : ''
    });

    setEditingTransactionId(null);
    refreshData();
  };

  // Get unique locations that have appeared at least 3 times in transactions (either in 'from' or 'to')
  const getPopularLocations = () => {
    const counts: { [key: string]: { original: string; count: number } } = {};
    transactions.forEach(t => {
      const processLoc = (loc: string) => {
        const trimmed = loc.trim();
        if (trimmed) {
          const lower = trimmed.toLowerCase();
          if (counts[lower]) {
            counts[lower].count += 1;
          } else {
            counts[lower] = { original: trimmed, count: 1 };
          }
        }
      };
      if (t.from) processLoc(t.from);
      if (t.to) processLoc(t.to);
    });

    return Object.values(counts)
      .filter(item => item.count >= 3)
      .map(item => item.original);
  };

  const popularLocations = getPopularLocations();

  // --- INCOME EXCEL GRID STATE ---
  const [incDate, setIncDate] = useState(today);
  const [incVehicleId, setIncVehicleId] = useState('');
  const [incFrom, setIncFrom] = useState('');
  const [incTo, setIncTo] = useState('');
  const [incWeight, setIncWeight] = useState('');
  const [incRate, setIncRate] = useState('');
  const [incAmount, setIncAmount] = useState('');
  const [incPaymentMode, setIncPaymentMode] = useState<'Cash' | 'Bank' | 'UPI' | 'Pending' | 'Check' | 'Online' | ''>('');
  const [incEvidence, setIncEvidence] = useState('');
  const [incMaterial, setIncMaterial] = useState('');

  // Auto-calculate amount when weight or rate changes
  React.useEffect(() => {
    const w = Number(incWeight);
    const r = Number(incRate);
    if (w > 0 && r > 0) {
      setIncAmount((w * r).toString());
    }
  }, [incWeight, incRate]);

  const handleSaveIncomeRow = async () => {
    const finalAmount = Number(incAmount);
    if (!incVehicleId || !incPaymentMode || isNaN(finalAmount) || finalAmount <= 0) {
      alert("Please ensure a vehicle and payment status are selected, and the Total Amount is greater than 0.");
      return;
    }
    
    const res = await addTransaction({
      vehicleId: incVehicleId,
      date: incDate,
      type: 'income',
      category: 'Freight Booking', 
      amount: finalAmount,
      paymentMode: incPaymentMode as any,
      description: incEvidence, 
      from: incFrom,
      to: incTo,
      weight: incWeight ? Number(incWeight) : undefined,
      rate: incRate ? Number(incRate) : undefined,
      material: incMaterial.trim() || undefined
    });

    if (!res || (res as any).error) {
       alert("Failed to save transaction. Error: " + ((res as any)?.error || "Unknown"));
       return;
    }
    
    setIncFrom('');
    setIncTo('');
    setIncWeight('');
    setIncRate('');
    setIncAmount('');
    setIncPaymentMode('');
    setIncEvidence('');
    setIncMaterial('');
    refreshData();
  };

  // --- EXPENSE GRID STATE ---
  const [activeExpenseTab, setActiveExpenseTab] = useState<'fixed' | 'maintenance'>('fixed');

  const currentExpenseCategories = activeExpenseTab === 'fixed' ? FIXED_CATEGORIES : MAINTENANCE_CATEGORIES;

  const [expDate, setExpDate] = useState(today);
  const [expVehicleId, setExpVehicleId] = useState('');
  const [expCategory, setExpCategory] = useState<TransactionCategory | ''>('');
  const [expAmount, setExpAmount] = useState('');
  const [expPaymentMode, setExpPaymentMode] = useState<'Cash' | 'Bank' | 'UPI' | 'Pending' | 'Check' | 'Online'>('Cash');
  const [expDesc, setExpDesc] = useState('');
  const [expPartyName, setExpPartyName] = useState('');

  // Auto-update default category when changing tabs
  React.useEffect(() => {
    setExpCategory('');
  }, [activeExpenseTab]);

  const handleSaveExpenseRow = async () => {
    if (!expVehicleId || !expCategory || !expAmount || isNaN(Number(expAmount)) || Number(expAmount) <= 0) {
      alert("Please ensure a vehicle and an expense category are selected, and the Amount is greater than 0.");
      return;
    }
    
    await addTransaction({
      vehicleId: expVehicleId,
      date: expDate,
      type: 'expense',
      category: expCategory as TransactionCategory,
      amount: Number(expAmount),
      paymentMode: expPaymentMode as any,
      description: expDesc,
      partyName: expPartyName.trim() || undefined
    });
    
    setExpAmount('');
    setExpDesc('');
    setExpPaymentMode('Cash');
    setExpPartyName('');
    setExpCategory('');
    refreshData();
  };

  const recentIncomes = [...transactions]
    .filter(t => t.type === 'income')
    .sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (a._id && b._id) {
        return b._id.localeCompare(a._id);
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })
    .slice(0, 50);
  
  // Get recent expenses (show all categories so entries added elsewhere or in other tab are visible)
  const recentExpenses = [...transactions]
    .filter(t => t.type === 'expense')
    .sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (a._id && b._id) {
        return b._id.localeCompare(a._id);
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })
    .slice(0, 50);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div className="page-title-group">
          <h1>Dashboard</h1>
          <p className="page-subtitle">Rapidly record income and expenses across your fleet.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-primary" 
            style={{ backgroundColor: '#3B82F6', color: '#fff', fontWeight: 'bold' }}
            onClick={() => document.getElementById('income-grid')?.scrollIntoView({ behavior: 'smooth' })}
          >
            + Add Income
          </button>
          <button 
            className="btn btn-primary" 
            style={{ backgroundColor: '#F2994A', color: '#fff', fontWeight: 'bold' }}
            onClick={() => document.getElementById('expense-grid')?.scrollIntoView({ behavior: 'smooth' })}
          >
            + Add Expense
          </button>
        </div>
      </div>

      <div id="income-grid" className="card" style={{ borderTop: '4px solid var(--color-success)', padding: '16px 0' }}>
        <h3 className="card-title" style={{ color: 'var(--color-success)', marginBottom: '16px', paddingLeft: '16px' }}>Add Income</h3>

        {isMobile ? (
          <div style={{ padding: '0 16px' }}>
            <div className="mobile-add-form">
              <div className="mobile-form-row">
                <div className="mobile-form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-control form-control-sm" value={incDate} onChange={e => setIncDate(e.target.value)} />
                </div>
                <div className="mobile-form-group">
                  <label className="form-label">Vehicle</label>
                  <select className="form-control form-control-sm" value={incVehicleId} onChange={e => setIncVehicleId(e.target.value)}>
                    <option value="">Select Vehicle</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
                  </select>
                </div>
              </div>

              <div className="mobile-form-row">
                <div className="mobile-form-group">
                  <label className="form-label">Material</label>
                  <input type="text" className="form-control form-control-sm" placeholder="e.g. Coal" value={incMaterial} onChange={e => setIncMaterial(e.target.value)} />
                </div>
                <div className="mobile-form-group">
                  <label className="form-label">Payment Status</label>
                  <select className="form-control form-control-sm" value={incPaymentMode} onChange={e => setIncPaymentMode(e.target.value as any)}>
                    <option value="">Select</option>
                    <option value="Pending">Pending</option>
                    <option value="Cash">Cash</option>
                    <option value="Check">Check</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
              </div>

              <div className="mobile-form-row">
                <div className="mobile-form-group">
                  <label className="form-label">Origin (From)</label>
                  <input type="text" list="location-suggestions" className="form-control form-control-sm" placeholder="Origin" value={incFrom} onChange={e => setIncFrom(e.target.value)} />
                </div>
                <div className="mobile-form-group">
                  <label className="form-label">Destination (To)</label>
                  <input type="text" list="location-suggestions" className="form-control form-control-sm" placeholder="Destination" value={incTo} onChange={e => setIncTo(e.target.value)} />
                </div>
              </div>

              <div className="mobile-form-row">
                <div className="mobile-form-group">
                  <label className="form-label">Weight (Ton)</label>
                  <input type="number" className="form-control form-control-sm" placeholder="Weight" value={incWeight} onChange={e => setIncWeight(e.target.value)} />
                </div>
                <div className="mobile-form-group">
                  <label className="form-label">Rate (₹/Ton)</label>
                  <input type="number" className="form-control form-control-sm" placeholder="Rate" value={incRate} onChange={e => setIncRate(e.target.value)} />
                </div>
              </div>

              <div className="mobile-form-row">
                <div className="mobile-form-group">
                  <label className="form-label">Total Amount (₹)</label>
                  <input type="number" className="form-control form-control-sm" placeholder="Total" value={incAmount} onChange={e => setIncAmount(e.target.value)} style={{ fontWeight: 'bold', color: 'var(--color-success)' }} />
                </div>
                <div className="mobile-form-group">
                  <label className="form-label">Evidence / Ref No.</label>
                  <input type="text" className="form-control form-control-sm" placeholder="Check#, UPI ID..." value={incEvidence} onChange={e => setIncEvidence(e.target.value)} />
                </div>
              </div>

              <button 
                className="btn btn-success btn-sm" 
                onClick={handleSaveIncomeRow} 
                disabled={vehicles.length === 0 || !incVehicleId || !incPaymentMode || !incAmount || Number(incAmount) <= 0}
                style={{ width: '100%', marginTop: '8px' }}
              >
                <Save size={14} /> Add Income
              </button>
            </div>

            <div className="mobile-card-list" style={{ padding: '0' }}>
              <h4 style={{ margin: '16px 0 8px 0', color: 'var(--text-secondary)' }}>Recent Incomes</h4>
              {recentIncomes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>No recent income</div>
              ) : (
                recentIncomes.map(t => {
                  const vehicle = vehicles.find(v => v.id === t.vehicleId);
                  
                  if (editingTransactionId === t.id) {
                    return (
                      <div key={t.id} className="mobile-transaction-card" style={{ border: '1px solid var(--accent-primary)', background: 'rgba(212, 175, 55, 0.04)' }}>
                        <div className="mobile-form-row">
                          <div className="mobile-form-group">
                            <label className="form-label">Date</label>
                            <input type="date" className="form-control form-control-sm" value={editDate} onChange={e => setEditDate(e.target.value)} />
                          </div>
                          <div className="mobile-form-group">
                            <label className="form-label">Vehicle</label>
                            <select className="form-control form-control-sm" value={editVehicleId} onChange={e => setEditVehicleId(e.target.value)}>
                              <option value="">Select</option>
                              {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="mobile-form-row">
                          <div className="mobile-form-group">
                            <label className="form-label">Material</label>
                            <input type="text" className="form-control form-control-sm" value={editMaterial} onChange={e => setEditMaterial(e.target.value)} />
                          </div>
                          <div className="mobile-form-group">
                            <label className="form-label">Payment Status</label>
                            <select className="form-control form-control-sm" value={editPaymentMode} onChange={e => setEditPaymentMode(e.target.value as any)}>
                              <option value="Pending">Pending</option>
                              <option value="Cash">Cash</option>
                              <option value="Check">Check</option>
                              <option value="Online">Online</option>
                            </select>
                          </div>
                        </div>
                        <div className="mobile-form-row">
                          <div className="mobile-form-group">
                            <label className="form-label">Origin (From)</label>
                            <input type="text" list="location-suggestions" className="form-control form-control-sm" value={editFrom} onChange={e => setEditFrom(e.target.value)} />
                          </div>
                          <div className="mobile-form-group">
                            <label className="form-label">Destination (To)</label>
                            <input type="text" list="location-suggestions" className="form-control form-control-sm" value={editTo} onChange={e => setEditTo(e.target.value)} />
                          </div>
                        </div>
                        <div className="mobile-form-row">
                          <div className="mobile-form-group">
                            <label className="form-label">Weight</label>
                            <input type="number" className="form-control form-control-sm" value={editWeight} onChange={e => setEditWeight(e.target.value)} />
                          </div>
                          <div className="mobile-form-group">
                            <label className="form-label">Rate</label>
                            <input type="number" className="form-control form-control-sm" value={editRate} onChange={e => setEditRate(e.target.value)} />
                          </div>
                        </div>
                        <div className="mobile-form-row">
                          <div className="mobile-form-group">
                            <label className="form-label">Total</label>
                            <input type="number" className="form-control form-control-sm" value={editAmount} onChange={e => setEditAmount(e.target.value)} style={{ fontWeight: 'bold', color: 'var(--color-success)' }} />
                          </div>
                          <div className="mobile-form-group">
                            <label className="form-label">Evidence</label>
                            <input type="text" className="form-control form-control-sm" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                          <button className="btn btn-sm btn-success" onClick={() => handleUpdateIncome(t)}>
                            <Check size={14} /> Save
                          </button>
                          <button className="btn btn-sm btn-secondary" onClick={() => setEditingTransactionId(null)}>
                            <X size={14} /> Cancel
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const getBadgeClass = (mode: string) => {
                    if (mode === 'Pending') return 'badge danger';
                    if (mode === 'Cash') return 'badge success';
                    return 'badge info';
                  };

                  return (
                    <div key={t.id} className="mobile-transaction-card">
                      <div className="mobile-card-header">
                        <span className="mobile-card-vehicle">{vehicle ? vehicle.vehicleNumber : '-'}</span>
                        <span className="mobile-card-date">{formatDate(t.date)}</span>
                      </div>
                      <div className="mobile-card-body">
                        <div className="mobile-card-detail-row">
                          <span className="mobile-card-label">Material:</span>
                          <span className="mobile-card-value">{t.material || '-'}</span>
                        </div>
                        <div className="mobile-card-detail-row">
                          <span className="mobile-card-label">Route:</span>
                          <span className="mobile-card-value">{t.from || '-'} → {t.to || '-'}</span>
                        </div>
                        {(t.weight || t.rate) && (
                          <div className="mobile-card-detail-row">
                            <span className="mobile-card-label">Qty/Rate:</span>
                            <span className="mobile-card-value">{t.weight ? `${t.weight} Tons` : '-'} @ {t.rate ? formatCurrency(t.rate) : '-'}</span>
                          </div>
                        )}
                        <div className="mobile-card-detail-row">
                          <span className="mobile-card-label">Payment:</span>
                          <span className={getBadgeClass(t.paymentMode)}>{t.paymentMode}</span>
                        </div>
                        {t.description && (
                          <div className="mobile-card-detail-row">
                            <span className="mobile-card-label">Ref/Notes:</span>
                            <span className="mobile-card-value" style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>{t.description}</span>
                          </div>
                        )}
                      </div>
                      <div className="mobile-card-footer">
                        <span className="mobile-card-amount amount-income">+{formatCurrency(t.amount)}</span>
                        <div className="mobile-card-actions">
                          <button className="btn btn-sm btn-secondary" onClick={() => startEditing(t)} style={{ padding: '6px 8px' }}>
                            <Edit2 size={12} />
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)} style={{ padding: '6px 8px' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="table-container" style={{ maxHeight: '400px', overflow: 'auto', margin: '0' }}>
            <table className="custom-table center-align-table" style={{ minWidth: '1140px' }}>
              <thead>
                <tr>
                  <th style={{ width: '100px', textAlign: 'center' }}>Date</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Vehicle</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Material</th>
                  <th style={{ width: '110px' }}>From</th>
                  <th style={{ width: '110px' }}>To</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Weight</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Rate</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Total</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Payment Status</th>
                  <th style={{ width: '130px' }}>Evidence/Ref No.</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {/* ACTIVE INPUT ROW */}
                <tr className="active-input-row" style={{ background: 'rgba(52, 211, 153, 0.05)' }}>
                  <td>
                    <input type="date" className="form-control form-control-sm" value={incDate} onChange={e => setIncDate(e.target.value)} style={{ width: '100%', textAlign: 'center' }} />
                  </td>
                  <td>
                    <select className="form-control form-control-sm" value={incVehicleId} onChange={e => setIncVehicleId(e.target.value)} style={{ width: '100%', textAlign: 'center' }}>
                      <option value="">Select Vehicle</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
                    </select>
                  </td>
                  <td>
                    <input type="text" className="form-control form-control-sm" placeholder="Material (e.g. Coal)" value={incMaterial} onChange={e => setIncMaterial(e.target.value)} style={{ width: '100%', textAlign: 'center' }} />
                  </td>
                  <td>
                    <input type="text" list="location-suggestions" className="form-control form-control-sm" placeholder="Origin" value={incFrom} onChange={e => setIncFrom(e.target.value)} style={{ width: '100%', textAlign: 'center' }} />
                  </td>
                  <td>
                    <input type="text" list="location-suggestions" className="form-control form-control-sm" placeholder="Dest" value={incTo} onChange={e => setIncTo(e.target.value)} style={{ width: '100%', textAlign: 'center' }} />
                  </td>
                  <td>
                    <input type="number" className="form-control form-control-sm" placeholder="Ton" value={incWeight} onChange={e => setIncWeight(e.target.value)} style={{ width: '100%', textAlign: 'center' }} />
                  </td>
                  <td>
                    <input type="number" className="form-control form-control-sm" placeholder="₹/Ton" value={incRate} onChange={e => setIncRate(e.target.value)} style={{ width: '100%', textAlign: 'center' }} />
                  </td>
                  <td>
                    <input type="number" className="form-control form-control-sm" placeholder="Total ₹" value={incAmount} onChange={e => setIncAmount(e.target.value)} style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--color-success)', width: '100%' }} />
                  </td>
                  <td>
                    <select className="form-control form-control-sm" value={incPaymentMode} onChange={e => setIncPaymentMode(e.target.value as any)} style={{ width: '100%', textAlign: 'center' }}>
                      <option value="">Select</option>
                      <option value="Pending">Pending</option>
                      <option value="Cash">Cash</option>
                      <option value="Check">Check</option>
                      <option value="Online">Online</option>
                    </select>
                  </td>
                  <td>
                    <input type="text" className="form-control form-control-sm" placeholder="Check#, UPI ID..." value={incEvidence} onChange={e => setIncEvidence(e.target.value)} style={{ width: '100%', textAlign: 'center' }} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-income-save btn-sm" onClick={handleSaveIncomeRow} disabled={vehicles.length === 0 || !incVehicleId || !incPaymentMode || !incAmount || Number(incAmount) <= 0} style={{ width: '100%' }}>
                      <Save size={14} /> Add
                    </button>
                  </td>
                </tr>
                
                {/* RECENT INCOMES */}
                {recentIncomes.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No recent income</td>
                  </tr>
                ) : (
                  recentIncomes.map(t => {
                    const vehicle = vehicles.find(v => v.id === t.vehicleId);
                    if (editingTransactionId === t.id) {
                      return (
                        <tr key={t.id} style={{ background: 'rgba(212, 175, 55, 0.08)' }}>
                          <td>
                            <input type="date" className="form-control form-control-sm" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ width: '100%', textAlign: 'center' }} />
                          </td>
                          <td>
                            <select className="form-control form-control-sm" value={editVehicleId} onChange={e => setEditVehicleId(e.target.value)} style={{ width: '100%', textAlign: 'center' }}>
                              <option value="">Select</option>
                              {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
                            </select>
                          </td>
                          <td>
                            <input type="text" className="form-control form-control-sm" placeholder="Material" value={editMaterial} onChange={e => setEditMaterial(e.target.value)} style={{ width: '100%', textAlign: 'center' }} />
                          </td>
                          <td>
                            <input type="text" list="location-suggestions" className="form-control form-control-sm" placeholder="Origin" value={editFrom} onChange={e => setEditFrom(e.target.value)} style={{ width: '100%', textAlign: 'center' }} />
                          </td>
                          <td>
                            <input type="text" list="location-suggestions" className="form-control form-control-sm" placeholder="Dest" value={editTo} onChange={e => setEditTo(e.target.value)} style={{ width: '100%', textAlign: 'center' }} />
                          </td>
                          <td>
                            <input type="number" className="form-control form-control-sm" placeholder="Ton" value={editWeight} onChange={e => setEditWeight(e.target.value)} style={{ width: '100%', textAlign: 'center' }} />
                          </td>
                          <td>
                            <input type="number" className="form-control form-control-sm" placeholder="Rate" value={editRate} onChange={e => setEditRate(e.target.value)} style={{ width: '100%', textAlign: 'center' }} />
                          </td>
                          <td>
                            <input type="number" className="form-control form-control-sm" placeholder="Total" value={editAmount} onChange={e => setEditAmount(e.target.value)} style={{ width: '100%', textAlign: 'center', fontWeight: 'bold', color: 'var(--color-success)' }} />
                          </td>
                          <td>
                            <select className="form-control form-control-sm" value={editPaymentMode} onChange={e => setEditPaymentMode(e.target.value as any)} style={{ width: '100%', textAlign: 'center' }}>
                              <option value="Pending">Pending</option>
                              <option value="Cash">Cash</option>
                              <option value="Check">Check</option>
                              <option value="Online">Online</option>
                            </select>
                          </td>
                          <td>
                            <input type="text" className="form-control form-control-sm" placeholder="Ref#" value={editDescription} onChange={e => setEditDescription(e.target.value)} style={{ width: '100%', textAlign: 'center' }} />
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                              <button className="btn btn-sm btn-icon" onClick={() => handleUpdateIncome(t)} title="Save" style={{ background: 'transparent', border: 'none', color: 'var(--color-success)', padding: '2px 4px', cursor: 'pointer' }}>
                                <Check size={16} />
                              </button>
                              <button className="btn btn-sm btn-icon" onClick={() => setEditingTransactionId(null)} title="Cancel" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '2px 4px', cursor: 'pointer' }}>
                                <X size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={t.id}>
                        <td style={{ textAlign: 'center' }}>{formatDate(t.date)}</td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{vehicle ? vehicle.vehicleNumber : '-'}</td>
                        <td style={{ textAlign: 'center', fontWeight: '500' }}>{t.material || '-'}</td>
                        <td>{t.from || '-'}</td>
                        <td>{t.to || '-'}</td>
                        <td style={{ textAlign: 'center' }}>{t.weight || '-'}</td>
                        <td style={{ textAlign: 'center' }}>{t.rate ? formatCurrency(t.rate) : '-'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }} className="amount-income">
                          +{formatCurrency(t.amount)}
                        </td>
                        <td style={{ textAlign: 'center' }}>{t.paymentMode}</td>
                        <td>{t.description || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                            <button className="btn btn-sm btn-icon" onClick={() => startEditing(t)} title="Edit" style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', padding: '2px 4px', cursor: 'pointer' }}>
                              <Edit2 size={14} />
                            </button>
                            <button className="btn btn-sm btn-icon" onClick={() => handleDelete(t.id)} title="Delete" style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', padding: '2px 4px', cursor: 'pointer' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EXPENSE GRID (FULL WIDTH WITH TABS) */}
      <div id="expense-grid" className="card" style={{ borderTop: '4px solid var(--color-danger)', display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
        <h3 className="card-title" style={{ color: 'var(--color-danger)', marginTop: '8px', marginBottom: '8px' }}>
          Add Expenses
        </h3>

        {/* TABS (Now placed BELOW the "Add Expenses" heading) */}
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <button 
            className={`btn ${activeExpenseTab === 'fixed' ? 'btn-primary' : 'btn-secondary'}`}
            style={activeExpenseTab === 'fixed' ? { backgroundColor: '#AA771C', color: '#fff', borderColor: '#AA771C' } : {}}
            onClick={() => setActiveExpenseTab('fixed')}
          >
            🏢 Fixed Expenses
          </button>
          <button 
            className={`btn ${activeExpenseTab === 'maintenance' ? 'btn-primary' : 'btn-secondary'}`}
            style={activeExpenseTab === 'maintenance' ? { backgroundColor: '#AA771C', color: '#fff', borderColor: '#AA771C' } : {}}
            onClick={() => setActiveExpenseTab('maintenance')}
          >
            🔧 Maintenance Expenses
          </button>
        </div>

        {isMobile ? (
          <div style={{ padding: '0 16px' }}>
            <div className="mobile-add-form">
              <div className="mobile-form-row">
                <div className="mobile-form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-control form-control-sm" value={expDate} onChange={e => setExpDate(e.target.value)} />
                </div>
                <div className="mobile-form-group">
                  <label className="form-label">Vehicle</label>
                  <select className="form-control form-control-sm" value={expVehicleId} onChange={e => setExpVehicleId(e.target.value)}>
                    <option value="">Select Vehicle</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
                  </select>
                </div>
              </div>

              <div className="mobile-form-row">
                <div className="mobile-form-group">
                  <label className="form-label">Category</label>
                  <select className="form-control form-control-sm" value={expCategory} onChange={e => setExpCategory(e.target.value as TransactionCategory)}>
                    <option value="">Select Expense</option>
                    {currentExpenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="mobile-form-group">
                  <label className="form-label">Party Name (Paid To)</label>
                  <input type="text" className="form-control form-control-sm" placeholder="Party Name" value={expPartyName} onChange={e => setExpPartyName(e.target.value)} />
                </div>
              </div>

              <div className="mobile-form-row">
                <div className="mobile-form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input type="number" className="form-control form-control-sm" placeholder="₹ Amount" value={expAmount} onChange={e => setExpAmount(e.target.value)} style={{ textAlign: 'right' }} />
                </div>
                <div className="mobile-form-group">
                  <label className="form-label">Payable Status</label>
                  <select className="form-control form-control-sm" value={expPaymentMode} onChange={e => setExpPaymentMode(e.target.value as any)}>
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="UPI">UPI</option>
                    <option value="Check">Check</option>
                    <option value="Online">Online</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="mobile-form-group full-width">
                <label className="form-label">Evidence / Ref No. / Notes</label>
                <input type="text" className="form-control form-control-sm" placeholder="Ref/Notes/Evidence" value={expDesc} onChange={e => setExpDesc(e.target.value)} />
              </div>

              <button 
                className="btn btn-danger btn-sm" 
                onClick={handleSaveExpenseRow} 
                disabled={vehicles.length === 0 || !expVehicleId || !expCategory || !expAmount}
                style={{ width: '100%', marginTop: '8px', backgroundColor: 'var(--color-danger)', color: '#fff' }}
              >
                <Save size={14} /> Add Expense
              </button>
            </div>

            <div className="mobile-card-list" style={{ padding: '0' }}>
              <h4 style={{ margin: '16px 0 8px 0', color: 'var(--text-secondary)' }}>Recent Expenses</h4>
              {recentExpenses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>No recent expenses in this category</div>
              ) : (
                recentExpenses.map(t => {
                  const vehicle = vehicles.find(v => v.id === t.vehicleId);
                  
                  if (editingTransactionId === t.id) {
                    return (
                      <div key={t.id} className="mobile-transaction-card" style={{ border: '1px solid var(--accent-primary)', background: 'rgba(212, 175, 55, 0.04)' }}>
                        <div className="mobile-form-row">
                          <div className="mobile-form-group">
                            <label className="form-label">Date</label>
                            <input type="date" className="form-control form-control-sm" value={editDate} onChange={e => setEditDate(e.target.value)} />
                          </div>
                          <div className="mobile-form-group">
                            <label className="form-label">Vehicle</label>
                            <select className="form-control form-control-sm" value={editVehicleId} onChange={e => setEditVehicleId(e.target.value)}>
                              <option value="">Select</option>
                              {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="mobile-form-row">
                          <div className="mobile-form-group">
                            <label className="form-label">Category</label>
                            <select className="form-control form-control-sm" value={editCategory} onChange={e => setEditCategory(e.target.value as TransactionCategory)}>
                              {activeExpenseTab === 'fixed' 
                                ? FIXED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                                : MAINTENANCE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                              }
                            </select>
                          </div>
                          <div className="mobile-form-group">
                            <label className="form-label">Party Name</label>
                            <input type="text" className="form-control form-control-sm" value={editPartyName} onChange={e => setEditPartyName(e.target.value)} />
                          </div>
                        </div>
                        <div className="mobile-form-row">
                          <div className="mobile-form-group">
                            <label className="form-label">Amount</label>
                            <input type="number" className="form-control form-control-sm" value={editAmount} onChange={e => setEditAmount(e.target.value)} style={{ fontWeight: 'bold', color: 'var(--color-danger)' }} />
                          </div>
                          <div className="mobile-form-group">
                            <label className="form-label">Payable Status</label>
                            <select className="form-control form-control-sm" value={editPaymentMode} onChange={e => setEditPaymentMode(e.target.value as any)}>
                              <option value="Cash">Cash</option>
                              <option value="Bank">Bank</option>
                              <option value="UPI">UPI</option>
                              <option value="Check">Check</option>
                              <option value="Online">Online</option>
                              <option value="Pending">Pending</option>
                            </select>
                          </div>
                        </div>
                        <div className="mobile-form-group full-width">
                          <label className="form-label">Evidence / Notes</label>
                          <input type="text" className="form-control form-control-sm" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                          <button className="btn btn-sm btn-success" onClick={() => handleUpdateExpense(t)}>
                            <Check size={14} /> Save
                          </button>
                          <button className="btn btn-sm btn-secondary" onClick={() => setEditingTransactionId(null)}>
                            <X size={14} /> Cancel
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const getBadgeClass = (mode: string) => {
                    if (mode === 'Pending') return 'badge danger';
                    if (mode === 'Cash') return 'badge success';
                    return 'badge info';
                  };

                  return (
                    <div key={t.id} className="mobile-transaction-card">
                      <div className="mobile-card-header">
                        <span className="mobile-card-vehicle">{vehicle ? vehicle.vehicleNumber : '-'}</span>
                        <span className="mobile-card-date">{formatDate(t.date)}</span>
                      </div>
                      <div className="mobile-card-body">
                        <div className="mobile-card-detail-row">
                          <span className="mobile-card-label">Category:</span>
                          <span className="mobile-card-value">{t.category}</span>
                        </div>
                        <div className="mobile-card-detail-row">
                          <span className="mobile-card-label">Party Name:</span>
                          <span className="mobile-card-value">{t.partyName || '-'}</span>
                        </div>
                        <div className="mobile-card-detail-row">
                          <span className="mobile-card-label">Status:</span>
                          <span className={getBadgeClass(t.paymentMode)}>{t.paymentMode}</span>
                        </div>
                        {t.description && (
                          <div className="mobile-card-detail-row">
                            <span className="mobile-card-label">Notes:</span>
                            <span className="mobile-card-value" style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>{t.description}</span>
                          </div>
                        )}
                      </div>
                      <div className="mobile-card-footer">
                        <span className="mobile-card-amount amount-expense">-{formatCurrency(t.amount)}</span>
                        <div className="mobile-card-actions">
                          <button className="btn btn-sm btn-secondary" onClick={() => startEditing(t)} style={{ padding: '6px 8px' }}>
                            <Edit2 size={12} />
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)} style={{ padding: '6px 8px' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="table-container" style={{ maxHeight: '400px', overflow: 'auto' }}>
            <table className="custom-table center-align-table" style={{ minWidth: '950px' }}>
              <thead>
                <tr>
                  <th style={{ width: '100px', textAlign: 'center' }}>Date</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Vehicle</th>
                  <th style={{ width: '150px' }}>Category</th>
                  <th style={{ width: '130px' }}>Party Name</th>
                  <th style={{ textAlign: 'right', width: '100px' }}>Amount</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Payable Status</th>
                  <th style={{ width: '150px' }}>Evidence/Ref No.</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {/* ACTIVE INPUT ROW */}
                <tr className="active-input-row" style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                  <td>
                    <input type="date" className="form-control form-control-sm" value={expDate} onChange={e => setExpDate(e.target.value)} style={{ width: '100%', textAlign: 'center' }} />
                  </td>
                  <td>
                    <select className="form-control form-control-sm" value={expVehicleId} onChange={e => setExpVehicleId(e.target.value)} style={{ width: '100%', textAlign: 'center' }}>
                      <option value="">Select Vehicle</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="form-control form-control-sm" value={expCategory} onChange={e => setExpCategory(e.target.value as TransactionCategory)} style={{ width: '100%' }}>
                      <option value="">Select Expense</option>
                      {currentExpenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td>
                    <input type="text" className="form-control form-control-sm" placeholder="Paid To (Party Name)" value={expPartyName} onChange={e => setExpPartyName(e.target.value)} style={{ width: '100%' }} />
                  </td>
                  <td>
                    <input type="number" className="form-control form-control-sm" placeholder="₹ Amount" value={expAmount} onChange={e => setExpAmount(e.target.value)} style={{ textAlign: 'right', width: '100%' }} />
                  </td>
                  <td>
                    <select className="form-control form-control-sm" value={expPaymentMode} onChange={e => setExpPaymentMode(e.target.value as any)} style={{ width: '100%', textAlign: 'center' }}>
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank</option>
                      <option value="UPI">UPI</option>
                      <option value="Check">Check</option>
                      <option value="Online">Online</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </td>
                  <td>
                    <input type="text" className="form-control form-control-sm" placeholder="Ref/Notes/Evidence" value={expDesc} onChange={e => setExpDesc(e.target.value)} style={{ width: '100%' }} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-expense-save btn-sm" onClick={handleSaveExpenseRow} disabled={vehicles.length === 0 || !expVehicleId || !expCategory || !expAmount} style={{ width: '100%' }}>
                      <Save size={14} /> Add
                    </button>
                  </td>
                </tr>
                
                {/* RECENT EXPENSES */}
                {recentExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No recent expenses in this category</td>
                  </tr>
                ) : recentExpenses.map(t => {
                  const vehicle = vehicles.find(v => v.id === t.vehicleId);
                  if (editingTransactionId === t.id) {
                    return (
                      <tr key={t.id} style={{ background: 'rgba(212, 175, 55, 0.08)' }}>
                        <td>
                          <input type="date" className="form-control form-control-sm" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ width: '100%', textAlign: 'center' }} />
                        </td>
                        <td>
                          <select className="form-control form-control-sm" value={editVehicleId} onChange={e => setEditVehicleId(e.target.value)} style={{ width: '100%', textAlign: 'center' }}>
                            <option value="">Select</option>
                            {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="form-control form-control-sm" value={editCategory} onChange={e => setEditCategory(e.target.value as TransactionCategory)} style={{ width: '100%', textAlign: 'center' }}>
                            {activeExpenseTab === 'fixed' 
                              ? FIXED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                              : MAINTENANCE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                            }
                          </select>
                        </td>
                        <td>
                          <input type="text" className="form-control form-control-sm" placeholder="Party Name" value={editPartyName} onChange={e => setEditPartyName(e.target.value)} style={{ width: '100%', textAlign: 'center' }} />
                        </td>
                        <td>
                          <input type="number" className="form-control form-control-sm" placeholder="Amount" value={editAmount} onChange={e => setEditAmount(e.target.value)} style={{ width: '100%', textAlign: 'center', fontWeight: 'bold', color: 'var(--color-danger)' }} />
                        </td>
                        <td>
                          <select className="form-control form-control-sm" value={editPaymentMode} onChange={e => setEditPaymentMode(e.target.value as any)} style={{ width: '100%', textAlign: 'center' }}>
                            <option value="Cash">Cash</option>
                            <option value="Bank">Bank</option>
                            <option value="UPI">UPI</option>
                            <option value="Check">Check</option>
                            <option value="Online">Online</option>
                            <option value="Pending">Pending</option>
                          </select>
                        </td>
                        <td>
                          <input type="text" className="form-control form-control-sm" placeholder="Ref#" value={editDescription} onChange={e => setEditDescription(e.target.value)} style={{ width: '100%', textAlign: 'center' }} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                            <button className="btn btn-sm btn-icon" onClick={() => handleUpdateExpense(t)} title="Save" style={{ background: 'transparent', border: 'none', color: 'var(--color-success)', padding: '2px 4px', cursor: 'pointer' }}>
                              <Check size={16} />
                            </button>
                            <button className="btn btn-sm btn-icon" onClick={() => setEditingTransactionId(null)} title="Cancel" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '2px 4px', cursor: 'pointer' }}>
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={t.id}>
                      <td style={{ textAlign: 'center' }}>{formatDate(t.date)}</td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{vehicle ? vehicle.vehicleNumber : '-'}</td>
                      <td>{t.category}</td>
                      <td>{t.partyName || '-'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }} className="amount-expense">
                        -{formatCurrency(t.amount)}
                      </td>
                      <td style={{ textAlign: 'center' }}>{t.paymentMode}</td>
                      <td>{t.description || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                          <button className="btn btn-sm btn-icon" onClick={() => startEditing(t)} title="Edit" style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', padding: '2px 4px', cursor: 'pointer' }}>
                            <Edit2 size={14} />
                          </button>
                          <button className="btn btn-sm btn-icon" onClick={() => handleDelete(t.id)} title="Delete" style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', padding: '2px 4px', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <datalist id="location-suggestions">
        {popularLocations.map(loc => (
          <option key={loc} value={loc} />
        ))}
      </datalist>
    </div>
  );
};
