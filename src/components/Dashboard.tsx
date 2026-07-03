import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Truck, 
  ClipboardList
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import type { Vehicle, Transaction } from '../types';
import { getGlobalSummary, getVehicleSummary } from '../utils/storage';

interface DashboardProps {
  vehicles: Vehicle[];
  transactions: Transaction[];
  setActiveTab: (tab: string) => void;
  setSelectedVehicleId: (id: string | null) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  vehicles, 
  transactions, 
  setActiveTab,
  setSelectedVehicleId
}) => {
  const summary = getGlobalSummary(vehicles, transactions);

  // Helper to format currency in Indian Rupees format (or plain commas)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get data for charts (group by month for the last 6 months)
  const getChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData: { [key: string]: { month: string; income: number; expense: number; pending: number } } = {};

    // Initialize last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = {
        month: `${months[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`,
        income: 0,
        expense: 0,
        pending: 0
      };
    }

    transactions.forEach(t => {
      const tDate = new Date(t.date);
      const key = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key]) {
        if (t.paymentMode === 'Pending') {
          monthlyData[key].pending += t.amount;
        } else if (t.type === 'income') {
          monthlyData[key].income += t.amount;
        } else {
          monthlyData[key].expense += t.amount;
        }
      }
    });

    return Object.values(monthlyData);
  };

  const chartData = getChartData();
  const recentTransactions = transactions.slice(0, 5);

  const viewVehicleLedger = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setActiveTab('ledger');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here is an overview of your transport fleet accounts.</p>
        </div>
      </div>

      {/* Global Stat Cards */}
      <div className="stats-grid">
        <div className="card stat-card success">
          <div className="stat-icon-wrapper">
            <TrendingUp size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Earnings</span>
            <span className="stat-value">{formatCurrency(summary.totalIncome)}</span>
          </div>
        </div>

        <div className="card stat-card danger">
          <div className="stat-icon-wrapper">
            <TrendingDown size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Expenses</span>
            <span className="stat-value">{formatCurrency(summary.totalExpense)}</span>
          </div>
        </div>

        <div className={`card stat-card ${summary.balance >= 0 ? 'success' : 'danger'}`}>
          <div className="stat-icon-wrapper" style={{ backgroundColor: summary.balance >= 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', color: summary.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Net Balance</span>
            <span className="stat-value">{formatCurrency(summary.balance)}</span>
          </div>
        </div>

        <div className="card stat-card primary">
          <div className="stat-icon-wrapper">
            <Truck size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Active Vehicles</span>
            <span className="stat-value">{summary.vehicleCount}</span>
          </div>
        </div>
      </div>

      {/* Charts and Vehicle Summary */}
      <div className="dashboard-grid">
        {/* Recharts chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
          <h3 className="card-title">Income vs Expenses Trend</h3>
          <div style={{ flexGrow: 1, width: '100%', height: '300px', marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#171a26', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => [formatCurrency(Number(value)), '']}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Bar name="Earnings" dataKey="income" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                <Bar name="Expenses" dataKey="expense" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
                <Bar name="Pending" dataKey="pending" fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vehicles Quick Status */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="card-title">
            <span>Fleet Status</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('vehicles')}>View All</button>
          </h3>
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px', overflowY: 'auto', maxHeight: '300px' }}>
            {vehicles.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                No vehicles registered.
              </div>
            ) : (
              vehicles.map(v => {
                const vSum = getVehicleSummary(v.id, vehicles, transactions);
                return (
                  <div 
                    key={v.id} 
                    onClick={() => viewVehicleLedger(v.id)}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '12px', 
                      background: 'rgba(255,255,255,0.02)', 
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{v.vehicleNumber}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Driver: {v.driverName}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className={vSum.balance >= 0 ? 'amount-income' : 'amount-expense'}>
                        {formatCurrency(vSum.balance)}
                      </div>
                      <span className={`badge ${v.status === 'Active' ? 'success' : 'warning'}`} style={{ fontSize: '0.65rem', padding: '2px 6px', marginTop: '4px' }}>
                        {v.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Ledger Entries */}
      <div className="card">
        <h3 className="card-title">
          <span>Recent Entries</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('ledger')}>Go to Ledger</button>
        </h3>
        {recentTransactions.length === 0 ? (
          <div className="empty-state" style={{ border: 'none', padding: '30px' }}>
            <ClipboardList className="empty-state-icon" size={40} />
            <div className="empty-state-title">No transactions recorded yet</div>
            <p className="empty-state-desc" style={{ fontSize: '0.85rem' }}>Select the Ledger page to record fuel, tolls, earnings, and more.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle Number</th>
                  <th>Category</th>
                  <th>Payment Mode</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map(t => {
                  const vehicle = vehicles.find(v => v.id === t.vehicleId);
                  return (
                    <tr key={t.id}>
                      <td>{t.date}</td>
                      <td style={{ fontWeight: 600 }}>{vehicle ? vehicle.vehicleNumber : 'Deleted Vehicle'}</td>
                      <td>
                        <span className={`badge ${t.type === 'income' ? 'success' : 'danger'}`}>
                          {t.category}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span>{t.paymentMode}</span>
                          {t.wasPending && (
                            <span 
                              style={{ 
                                color: 'var(--color-success)', 
                                fontWeight: 'bold',
                                fontSize: '0.9rem'
                              }} 
                              title="Originally Pending, now Cleared"
                            >
                              ✓
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t.description || '-'}</td>
                      <td style={{ textAlign: 'right' }} className={t.type === 'income' ? 'amount-income' : 'amount-expense'}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
