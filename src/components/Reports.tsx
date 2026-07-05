import React, { useState, useEffect } from 'react';
import { Download, Truck, AlertCircle, Eye, TrendingUp, TrendingDown, DollarSign, X } from 'lucide-react';
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
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Vehicle, Transaction } from '../types';
import { getGlobalSummary, getVehicleSummary } from '../utils/storage';

interface ReportsProps {
  vehicles: Vehicle[];
  transactions: Transaction[];
}

export const Reports: React.FC<ReportsProps> = ({ vehicles, transactions }) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  
  // Set default month to current month
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [vehicleTxs, setVehicleTxs] = useState<Transaction[]>([]);
  const [filteredTxs, setFilteredTxs] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });

  const activeVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const globalSummary = getGlobalSummary(vehicles, transactions);

  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [modalListType, setModalListType] = useState<'income' | 'expense'>('income');
  const [showReportSheet, setShowReportSheet] = useState(false);

  useEffect(() => {
    setShowReportSheet(false);
  }, [selectedVehicleId, selectedMonth]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
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

  // Load transactions for selected vehicle
  useEffect(() => {
    if (selectedVehicleId) {
      const txs = transactions.filter(t => t.vehicleId === selectedVehicleId);
      setVehicleTxs(txs);
    } else {
      setVehicleTxs([]);
      setFilteredTxs([]);
    }
  }, [selectedVehicleId]);

  // Filter transactions when month or vehicle transactions change
  useEffect(() => {
    if (!selectedMonth || vehicleTxs.length === 0) {
      setFilteredTxs([]);
      setSummary({ income: 0, expense: 0, balance: 0 });
      return;
    }

    const [year, month] = selectedMonth.split('-');
    const txs = vehicleTxs.filter(t => {
      const tDate = new Date(t.date);
      return (
        tDate.getFullYear() === parseInt(year) &&
        (tDate.getMonth() + 1) === parseInt(month)
      );
    });

    // Sort chronologically (oldest to newest) for report statement
    const sortedTxs = [...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setFilteredTxs(sortedTxs);

    let income = 0;
    let expense = 0;
    sortedTxs.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });

    setSummary({
      income,
      expense,
      balance: income - expense
    });
  }, [selectedMonth, vehicleTxs]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPDFCurrency = (amount: number) => {
    return 'Rs. ' + new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getMonthName = (monthString: string) => {
    if (!monthString) return '';
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const handleDownloadPDF = () => {
    if (!activeVehicle || filteredTxs.length === 0) return;

    const doc = new jsPDF();
    const monthName = getMonthName(selectedMonth);

    // Title & Header branding
    doc.setFillColor(15, 17, 26);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('TRANSPORT LEDGER STATEMENT', 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Billing Period: ${monthName}`, 140, 20);

    // Vehicle details metadata
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('VEHICLE & OPERATOR INFORMATION', 14, 52);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text([
      `Vehicle Number:  ${activeVehicle.vehicleNumber}`,
      `Owner Name:      ${activeVehicle.ownerName}`,
      `Statement Month: ${monthName}`
    ], 14, 60);

    // Custom calculations for PDF matching the Ledger split
    let grossIncome = 0;
    let clearedIncome = 0;
    let totalExpense = 0;
    let clearedExpense = 0;

    filteredTxs.forEach(t => {
      if (t.type === 'income') {
        grossIncome += t.amount;
        if (t.paymentMode !== 'Pending') {
          clearedIncome += t.amount;
        }
      } else {
        totalExpense += t.amount;
        if (t.paymentMode !== 'Pending') {
          clearedExpense += t.amount;
        }
      }
    });

    const netCashBalance = clearedIncome - clearedExpense;

    // Financial Summary Cards inside PDF (4-column layout)
    // Card 1: Gross expected income (With Pending)
    doc.setFillColor(240, 253, 250);
    doc.roundedRect(14, 82, 42, 22, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(20, 110, 80);
    doc.text('TOTAL INCOME (EXPECT)', 17, 90);
    doc.setFontSize(10.5);
    doc.text(formatPDFCurrency(grossIncome), 17, 98);

    // Card 2: Cleared Income (Received Cash)
    doc.setFillColor(240, 253, 250);
    doc.roundedRect(60, 82, 42, 22, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(20, 110, 80);
    doc.text('CLEARED INCOME (RCVD)', 63, 90);
    doc.setFontSize(10.5);
    doc.text(formatPDFCurrency(clearedIncome), 63, 98);

    // Card 3: Total Expenses
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(106, 82, 42, 22, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 40, 40);
    doc.text('TOTAL EXPENSES', 109, 90);
    doc.setFontSize(10.5);
    doc.text(formatPDFCurrency(totalExpense), 109, 98);

    // Card 4: Net Cash Balance (In Hand)
    const isProfitable = netCashBalance >= 0;
    if (isProfitable) {
      doc.setFillColor(240, 253, 250);
    } else {
      doc.setFillColor(254, 242, 242);
    }
    doc.roundedRect(152, 82, 42, 22, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    if (isProfitable) {
      doc.setTextColor(20, 110, 80);
    } else {
      doc.setTextColor(180, 40, 40);
    }
    doc.text('NET CASH BALANCE', 155, 90);
    doc.setFontSize(10.5);
    doc.text(formatPDFCurrency(netCashBalance), 155, 98);

    // Transaction list tables grouped by Income & Expenses
    // 1. Income Transactions Table
    doc.setTextColor(20, 110, 80);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('💰 INCOME TRANSACTIONS', 14, 118);

    const incomeTxs = filteredTxs.filter(t => t.type === 'income');
    const incomeRows = incomeTxs.map((t, idx) => [
      idx + 1,
      formatDate(t.date),
      t.category,
      t.wasPending ? `${t.paymentMode} (Clrd)` : t.paymentMode,
      t.description || '-',
      formatPDFCurrency(t.amount)
    ]);
    
    // Add Subtotal row
    incomeRows.push([
      '', '', '', '', 
      'Total Income:', 
      formatPDFCurrency(grossIncome)
    ]);

    autoTable(doc, {
      startY: 122,
      head: [['Sr.', 'Date', 'Category', 'Mode', 'Description', 'Amount']],
      body: incomeRows,
      headStyles: {
        fillColor: [20, 110, 80],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 22 },
        2: { cellWidth: 35 },
        3: { cellWidth: 20 },
        4: { cellWidth: 70 },
        5: { halign: 'right', fontStyle: 'bold' }
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3
      },
      didParseCell: function(data) {
        // Style subtotal row
        if (data.row.index === incomeRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 253, 250];
        }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 12;

    // 2. Expense Transactions Table
    doc.setTextColor(180, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('💸 EXPENSE TRANSACTIONS', 14, currentY);

    const expenseTxs = filteredTxs.filter(t => t.type === 'expense');
    const expenseRows = expenseTxs.map((t, idx) => [
      idx + 1,
      formatDate(t.date),
      t.category,
      t.wasPending ? `${t.paymentMode} (Clrd)` : t.paymentMode,
      t.description || '-',
      formatPDFCurrency(t.amount)
    ]);
    
    // Add Subtotal row
    expenseRows.push([
      '', '', '', '', 
      'Total Expenses:', 
      formatPDFCurrency(totalExpense)
    ]);

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Sr.', 'Date', 'Category', 'Mode', 'Description', 'Amount']],
      body: expenseRows,
      headStyles: {
        fillColor: [180, 40, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 22 },
        2: { cellWidth: 35 },
        3: { cellWidth: 20 },
        4: { cellWidth: 70 },
        5: { halign: 'right', fontStyle: 'bold' }
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3
      },
      didParseCell: function(data) {
        // Style subtotal row
        if (data.row.index === expenseRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [254, 242, 242];
        }
      }
    });

    let finalCalculationsY = (doc as any).lastAutoTable.finalY + 12;
    
    // Add final Calculation Summary Block in PDF
    doc.setDrawColor(200, 200, 200);
    doc.line(120, finalCalculationsY, 196, finalCalculationsY);
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Gross Income:', 120, finalCalculationsY + 6);
    doc.text(formatPDFCurrency(grossIncome), 196, finalCalculationsY + 6, { align: 'right' });
    
    doc.text('Less: Total Expenses:', 120, finalCalculationsY + 12);
    doc.text('- ' + formatPDFCurrency(totalExpense), 196, finalCalculationsY + 12, { align: 'right' });
    
    doc.line(120, finalCalculationsY + 16, 196, finalCalculationsY + 16);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Net Margin Balance:', 120, finalCalculationsY + 22);
    if (netCashBalance >= 0) {
      doc.setTextColor(20, 110, 80);
    } else {
      doc.setTextColor(180, 40, 40);
    }
    doc.text(formatPDFCurrency(netCashBalance), 196, finalCalculationsY + 22, { align: 'right' });

    // Signature Area at the bottom
    const finalY = finalCalculationsY + 40;
    if (finalY < 265) {
      doc.setDrawColor(200, 200, 200);
      doc.line(14, finalY, 70, finalY);
      doc.line(140, finalY, 196, finalY);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Driver/Supervisor Signature', 14, finalY + 5);
      doc.text('Authorized Account Signature', 140, finalY + 5);
    }

    doc.save(`ledger_${activeVehicle.vehicleNumber}_${selectedMonth}.pdf`);
  };

  const handleDownloadCSV = () => {
    if (!activeVehicle || filteredTxs.length === 0) return;
    const monthName = getMonthName(selectedMonth);

    const csvRows = [];
    
    csvRows.push(`TRANSPORT STATEMENT - VEHICLE ACCOUNT BALANCE LEDGER`);
    csvRows.push(`Vehicle Number,${activeVehicle.vehicleNumber}`);
    csvRows.push(`Vehicle Type,${activeVehicle.type}`);
    csvRows.push(`Owner Name,${activeVehicle.ownerName}`);
    csvRows.push(`Driver Name,${activeVehicle.driverName}`);
    csvRows.push(`Driver Mobile,${activeVehicle.driverPhone}`);
    csvRows.push(`Statement Period,${monthName}`);
    csvRows.push(`Generated Date,${new Date().toLocaleString()}`);
    csvRows.push(``);
    
    csvRows.push(`Gross Income (Expected),Total Expenses,Net Margin Balance`);
    csvRows.push(`${summary.income},${summary.expense},${summary.balance}`);
    csvRows.push(``);
    
    csvRows.push(`Sr.,Date,Category,Payment Mode,Description,Income (+),Expense (-)`);
    
    filteredTxs.forEach((t, idx) => {
      const descEscaped = t.description ? `"${t.description.replace(/"/g, '""')}"` : '-';
      const catEscaped = `"${t.category.replace(/"/g, '""')}"`;
      const incomeVal = t.type === 'income' ? t.amount : '';
      const expenseVal = t.type === 'expense' ? t.amount : '';
      csvRows.push(`${idx + 1},${formatDate(t.date)},${catEscaped},${t.paymentMode},${descEscaped},${incomeVal},${expenseVal}`);
    });
    
    const csvString = csvRows.join("\n");
    const blob = new Blob(["\ufeff" + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_${activeVehicle.vehicleNumber}_${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };



  const getModalTransactions = () => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-');
    const monthlyTxs = transactions.filter(t => {
      const tDate = new Date(t.date);
      return (
        tDate.getFullYear() === parseInt(year) &&
        (tDate.getMonth() + 1) === parseInt(month)
      );
    });
    return monthlyTxs
      .filter(t => t.type === modalListType)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1>P&L (Profit and Loss)</h1>
          <p className="page-subtitle">View and download Profit & Loss financial statements for your vehicles.</p>
        </div>
      </div>

      {/* Global Stat Cards */}
      <div className="stats-grid">
        <div 
          className="card stat-card success"
          style={{ 
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onClick={() => { setModalListType('income'); setIsListModalOpen(true); }}
          title="Click to view all income entries"
        >
          <div className="stat-icon-wrapper">
            <TrendingUp size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Earnings</span>
            <span className="stat-value">{formatCurrency(globalSummary.totalIncome)}</span>
          </div>
        </div>

        <div 
          className="card stat-card danger"
          style={{ 
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onClick={() => { setModalListType('expense'); setIsListModalOpen(true); }}
          title="Click to view all expense entries"
        >
          <div className="stat-icon-wrapper">
            <TrendingDown size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Expenses</span>
            <span className="stat-value">{formatCurrency(globalSummary.totalExpense)}</span>
          </div>
        </div>

        <div className={`card stat-card ${globalSummary.balance >= 0 ? 'success' : 'danger'}`}>
          <div className="stat-icon-wrapper" style={{ backgroundColor: globalSummary.balance >= 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', color: globalSummary.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Net Balance</span>
            <span className="stat-value">{formatCurrency(globalSummary.balance)}</span>
          </div>
        </div>

        <div className="card stat-card primary">
          <div className="stat-icon-wrapper">
            <Truck size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Active Vehicles</span>
            <span className="stat-value">{globalSummary.vehicleCount}</span>
          </div>
        </div>
      </div>

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
              <Bar name="Earnings" dataKey="income" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
              <Bar name="Expenses" dataKey="expense" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
              <Bar name="Pending" dataKey="pending" fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Select Report Panel */}
      <div className="card filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
        <div className="filter-group">
          <label className="form-label">Select Vehicle</label>
          <select 
            className="form-select" 
            style={{ width: '250px' }}
            value={selectedVehicleId}
            onChange={e => setSelectedVehicleId(e.target.value)}
          >
            <option value="">-- Choose Vehicle --</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.driverName})</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="form-label">Statement Month</label>
          <input 
            type="month" 
            className="form-control"
            style={{ width: '200px' }}
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          />
        </div>

        {activeVehicle && filteredTxs.length > 0 && (
          <div className="report-actions">
            <button className="btn btn-primary" onClick={handleDownloadPDF}>
              <Download size={18} />
              Download PDF
            </button>
            <button className="btn btn-secondary" style={{ border: '1px solid var(--color-success)', color: 'var(--color-success)' }} onClick={handleDownloadCSV}>
              <Download size={18} />
              Download Excel (CSV)
            </button>
          </div>
        )}
      </div>

      {/* Main Report Display Workspace */}
      {!selectedVehicleId ? (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Fleet Overview & Financial Summary</h3>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '150px', textAlign: 'center' }}>Vehicle No</th>
                  <th>Owner Name</th>
                  <th style={{ textAlign: 'center', width: '120px' }}>Status</th>
                  <th style={{ textAlign: 'right', width: '150px' }}>Total Earnings</th>
                  <th style={{ textAlign: 'right', width: '150px' }}>Total Expenses</th>
                  <th style={{ textAlign: 'right', width: '150px' }}>Net Balance</th>
                  <th style={{ textAlign: 'center', width: '130px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => {
                  const sum = getVehicleSummary(v.id, vehicles, transactions);
                  return (
                    <tr key={v.id}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{v.vehicleNumber}</td>
                      <td>{v.ownerName}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${v.status === 'Active' ? 'success' : 'warning'}`}>
                          {v.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 600 }}>
                        {formatCurrency(sum.totalIncome)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--color-danger)', fontWeight: 600 }}>
                        {formatCurrency(sum.totalExpense)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }} className={sum.balance >= 0 ? 'amount-income' : 'amount-expense'}>
                        {formatCurrency(sum.balance)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn btn-primary btn-sm" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 'bold' }}
                          onClick={() => setSelectedVehicleId(v.id)}
                        >
                          View Statement
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : filteredTxs.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ border: 'none', padding: '40px' }}>
            <AlertCircle className="empty-state-icon" size={40} />
            <div className="empty-state-title">No transactions in {getMonthName(selectedMonth)}</div>
            <p className="empty-state-desc">We couldn't find any financial entries registered for {activeVehicle?.vehicleNumber || ''} during this month. Try recording transactions in the Ledger tab first.</p>
          </div>
        </div>
      ) : !showReportSheet ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Action Bar */}
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setSelectedVehicleId('')}
            >
              ⬅ Back to Fleet Summary
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-secondary"
                onClick={handleDownloadCSV}
              >
                Download CSV
              </button>
              <button 
                className="btn btn-primary"
                style={{ backgroundColor: 'var(--color-success)', color: '#000', fontWeight: 'bold' }}
                onClick={() => setShowReportSheet(true)}
              >
                📄 Show Report PDF
              </button>
            </div>
          </div>

          {/* Operator Banner */}
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Selected Vehicle</div>
              <h2 style={{ margin: '4px 0 0 0' }}>{activeVehicle?.vehicleNumber}</h2>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Operator Name</div>
              <div style={{ fontWeight: 600 }}>{activeVehicle?.ownerName}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Driver Details</div>
              <div style={{ fontWeight: 600 }}>{activeVehicle?.driverName} ({activeVehicle?.driverPhone})</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Statement Month</div>
              <div style={{ fontWeight: 600 }}>{getMonthName(selectedMonth)}</div>
            </div>
          </div>

          {/* Internal summary cards (Clickable to open popups!) */}
          <div className="report-sheet-summary-grid">
            <div 
              className="report-sheet-summary-box"
              style={{ 
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                padding: '16px',
                borderRadius: '8px'
              }}
              onClick={() => { setModalListType('income'); setIsListModalOpen(true); }}
              title="Click to view all income entries"
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Gross Income</span>
              <div className="report-sheet-summary-value" style={{ color: 'var(--color-success)', fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px' }}>{formatCurrency(summary.income)}</div>
            </div>
            <div 
              className="report-sheet-summary-box"
              style={{ 
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                padding: '16px',
                borderRadius: '8px'
              }}
              onClick={() => { setModalListType('expense'); setIsListModalOpen(true); }}
              title="Click to view all expense entries"
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Expenses</span>
              <div className="report-sheet-summary-value" style={{ color: 'var(--color-danger)', fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px' }}>{formatCurrency(summary.expense)}</div>
            </div>
            <div className="report-sheet-summary-box" style={{ background: summary.balance >= 0 ? 'rgba(52,211,153,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${summary.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}`, padding: '16px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Net Margin Balance</span>
              <div className="report-sheet-summary-value" style={{ color: summary.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px' }}>{formatCurrency(summary.balance)}</div>
            </div>
          </div>

          {/* Stacked Tables: Income first, then Expenses */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Income Entries Table */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 className="card-title" style={{ color: 'var(--color-success)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>💰 Income Entries</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                  Total Income: {formatCurrency(summary.income)}
                </span>
              </h3>
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>Sr.</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Date</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Material</th>
                      <th style={{ width: '120px' }}>From</th>
                      <th style={{ width: '120px' }}>To</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>Wt (Ton)</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Rate (₹)</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Mode</th>
                      <th>Description / Ref No.</th>
                      <th style={{ textAlign: 'right', width: '140px' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxs.filter(t => t.type === 'income').length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No income entries recorded.</td>
                      </tr>
                    ) : (
                      filteredTxs.filter(t => t.type === 'income').map((t, idx) => (
                        <tr key={t.id || idx}>
                          <td>{idx + 1}</td>
                          <td style={{ textAlign: 'center' }}>{formatDate(t.date)}</td>
                          <td style={{ textAlign: 'center', fontWeight: '500' }}>{t.material || '-'}</td>
                          <td>{t.from || '-'}</td>
                          <td>{t.to || '-'}</td>
                          <td style={{ textAlign: 'center' }}>{t.weight || '-'}</td>
                          <td style={{ textAlign: 'center' }}>{t.rate ? formatCurrency(t.rate) : '-'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span>{t.paymentMode}</span>
                              {t.wasPending && (
                                <span style={{ color: '#15803d', fontWeight: 'bold' }} title="Originally Pending, now Cleared">✓</span>
                              )}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.description || '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>
                            {formatCurrency(t.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expense Entries Table */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 className="card-title" style={{ color: 'var(--color-danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>💸 Expense Entries</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                  Total Expenses: {formatCurrency(summary.expense)}
                </span>
              </h3>
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>Sr.</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Date</th>
                      <th style={{ width: '150px' }}>Category</th>
                      <th style={{ width: '150px' }}>Party Name</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Mode</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right', width: '140px' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxs.filter(t => t.type === 'expense').length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No expense entries recorded.</td>
                      </tr>
                    ) : (
                      filteredTxs.filter(t => t.type === 'expense').map((t, idx) => (
                        <tr key={t.id || idx}>
                          <td>{idx + 1}</td>
                          <td style={{ textAlign: 'center' }}>{formatDate(t.date)}</td>
                          <td>
                            <span className="badge danger" style={{ fontSize: '0.7rem' }}>
                              {t.category}
                            </span>
                          </td>
                          <td>{t.partyName || '-'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span>{t.paymentMode}</span>
                              {t.wasPending && (
                                <span style={{ color: '#15803d', fontWeight: 'bold' }} title="Originally Pending, now Cleared">✓</span>
                              )}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.description || '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-danger)' }}>
                            {formatCurrency(t.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="report-preview-container">
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowReportSheet(false)}
            >
              ⬅ Back to Entries view
            </button>
            <button 
              className="btn btn-primary"
              style={{ backgroundColor: 'var(--color-success)', color: '#000', fontWeight: 'bold' }}
              onClick={handleDownloadPDF}
            >
              📥 Download Report PDF
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <Eye size={18} />
            <span>Document Preview (Lightweight print simulation):</span>
          </div>

          {/* Styled Invoice Paper Preview */}
          <div className="report-sheet">
            <div className="report-sheet-header">
              <div>
                <div className="report-sheet-logo">TRANSPORT STATEMENT</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>VEHICLE ACCOUNT BALANCE LEDGER</div>
              </div>
              <div className="report-sheet-meta">
                <div>Period: <strong>{getMonthName(selectedMonth)}</strong></div>
                <div style={{ marginTop: '4px' }}>Date: {new Date().toLocaleDateString()}</div>
              </div>
            </div>

            {/* Vehicle Profile Section */}
            <div className="report-profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '6px' }}>Vehicle & Operator</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>{activeVehicle?.vehicleNumber || ''}</div>
                <div style={{ color: '#475569', fontSize: '0.85rem', marginTop: '4px' }}>Owner: {activeVehicle?.ownerName || ''}</div>
              </div>
            </div>

            {/* Internal summary cards */}
            <div className="report-sheet-summary-grid">
              <div 
                className="report-sheet-summary-box"
                style={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => { setModalListType('income'); setIsListModalOpen(true); }}
                title="Click to view all income entries"
              >
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Gross Income</span>
                <div className="report-sheet-summary-value text-dark-success">{formatCurrency(summary.income)}</div>
              </div>
              <div 
                className="report-sheet-summary-box"
                style={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => { setModalListType('expense'); setIsListModalOpen(true); }}
                title="Click to view all expense entries"
              >
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Expenses</span>
                <div className="report-sheet-summary-value text-dark-danger">{formatCurrency(summary.expense)}</div>
              </div>
              <div className="report-sheet-summary-box" style={{ background: summary.balance >= 0 ? '#f0fdf4' : '#fef2f2', borderColor: summary.balance >= 0 ? '#bbf7d0' : '#fecaca' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Net Margin Balance</span>
                <div className={`report-sheet-summary-value ${summary.balance >= 0 ? 'text-dark-success' : 'text-dark-danger'}`}>{formatCurrency(summary.balance)}</div>
              </div>
            </div>

            {/* Income Transactions Details */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1e293b', borderBottom: '1.5px solid #cbd5e1', paddingBottom: '4px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                💰 Income Transactions Details
              </div>
              <table className="custom-table" style={{ background: 'transparent' }}>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>Sr.</th>
                    <th style={{ width: '100px' }}>Date</th>
                    <th style={{ width: '150px' }}>Category</th>
                    <th style={{ width: '80px' }}>Mode</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right', width: '130px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxs.filter(t => t.type === 'income').length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '12px' }}>No income transactions found for this period.</td>
                    </tr>
                  ) : (
                    <>
                      {filteredTxs.filter(t => t.type === 'income').map((t, idx) => (
                        <tr key={t.id || idx}>
                          <td>{idx + 1}</td>
                          <td>{formatDate(t.date)}</td>
                          <td>
                            <span className="badge success" style={{ fontSize: '0.7rem' }}>{t.category}</span>
                          </td>
                          <td>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span>{t.paymentMode}</span>
                              {t.wasPending && <span style={{ color: '#15803d', fontWeight: 'bold' }}>✓</span>}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: '#475569' }}>{t.description || '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }} className="text-dark-success">
                            {formatCurrency(t.amount)}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <td colSpan={5} style={{ textAlign: 'right', fontWeight: 'bold', color: '#1e293b' }}>Total Income:</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }} className="text-dark-success">
                          {formatCurrency(summary.income)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Expense Transactions Details */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1e293b', borderBottom: '1.5px solid #cbd5e1', paddingBottom: '4px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                💸 Expense Transactions Details
              </div>
              <table className="custom-table" style={{ background: 'transparent' }}>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>Sr.</th>
                    <th style={{ width: '100px' }}>Date</th>
                    <th style={{ width: '150px' }}>Category</th>
                    <th style={{ width: '150px' }}>Party Name</th>
                    <th style={{ width: '80px' }}>Mode</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right', width: '130px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxs.filter(t => t.type === 'expense').length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: '12px' }}>No expense transactions found for this period.</td>
                    </tr>
                  ) : (
                    <>
                      {filteredTxs.filter(t => t.type === 'expense').map((t, idx) => (
                        <tr key={t.id || idx}>
                          <td>{idx + 1}</td>
                          <td>{formatDate(t.date)}</td>
                          <td>
                            <span className="badge danger" style={{ fontSize: '0.7rem' }}>{t.category}</span>
                          </td>
                          <td>{t.partyName || '-'}</td>
                          <td>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span>{t.paymentMode}</span>
                              {t.wasPending && <span style={{ color: '#15803d', fontWeight: 'bold' }}>✓</span>}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: '#475569' }}>{t.description || '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }} className="text-dark-danger">
                            {formatCurrency(t.amount)}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <td colSpan={6} style={{ textAlign: 'right', fontWeight: 'bold', color: '#1e293b' }}>Total Expenses:</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }} className="text-dark-danger">
                          {formatCurrency(summary.expense)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Income-Expenses calculations and Net Balance */}
            <div style={{ marginTop: '24px', borderTop: '2.5px solid #94a3b8', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', color: '#1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Gross Income:</span>
                  <span style={{ fontWeight: 'bold' }} className="text-dark-success">{formatCurrency(summary.income)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Less: Total Expenses:</span>
                  <span style={{ fontWeight: 'bold' }} className="text-dark-danger">- {formatCurrency(summary.expense)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid #cbd5e1', paddingTop: '6px', fontSize: '1rem', fontWeight: 'bold' }}>
                  <span>Net Margin Balance:</span>
                  <span className={summary.balance >= 0 ? 'text-dark-success' : 'text-dark-danger'}>
                    {formatCurrency(summary.balance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Signature Area */}
            <div className="report-signature-container">
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '180px', borderTop: '1px solid #cbd5e1', paddingTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                  Driver / Assistant Signature
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '180px', borderTop: '1px solid #cbd5e1', paddingTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                  Authorized Accountant Signature
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction List Popup Modal */}
      {isListModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {modalListType === 'income' ? '💰' : '💸'} {modalListType === 'income' ? 'Income' : 'Expense'} Transactions Log 
                <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                  ({getMonthName(selectedMonth)} - Fleet-wide)
                </span>
              </h3>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '6px' }} 
                onClick={() => setIsListModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {getModalTransactions().length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  No {modalListType} entries found for this period.
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th style={{ width: '110px', textAlign: 'center' }}>Date</th>
                        <th style={{ width: '130px', textAlign: 'center' }}>Vehicle No</th>
                        <th style={{ width: '160px' }}>Category</th>
                        <th style={{ width: '150px' }}>Party Name</th>
                        <th>Description</th>
                        <th style={{ width: '110px', textAlign: 'center' }}>Mode</th>
                        <th style={{ textAlign: 'right', width: '130px' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getModalTransactions().map((t, idx) => {
                        const vehicle = vehicles.find(v => v.id === t.vehicleId);
                        return (
                          <tr key={t.id || idx}>
                            <td style={{ textAlign: 'center' }}>{formatDate(t.date)}</td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                              {vehicle ? vehicle.vehicleNumber : '-'}
                            </td>
                            <td>{t.category}</td>
                            <td>{t.partyName || '-'}</td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.description || '-'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge info" style={{ fontSize: '0.75rem' }}>{t.paymentMode}</span>
                            </td>
                            <td 
                              style={{ 
                                textAlign: 'right', 
                                fontWeight: 700, 
                                color: t.type === 'income' ? 'var(--color-success)' : 'var(--color-danger)' 
                              }}
                            >
                              {formatCurrency(t.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <div style={{ marginRight: 'auto', fontWeight: 'bold', fontSize: '1.05rem' }}>
                Total: <span style={{ color: modalListType === 'income' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {formatCurrency(getModalTransactions().reduce((sum, t) => sum + t.amount, 0))}
                </span>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setIsListModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
