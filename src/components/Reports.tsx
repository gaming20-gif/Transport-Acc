import React, { useState, useEffect } from 'react';
import { Download, Truck, AlertCircle, Eye } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Vehicle, Transaction } from '../types';

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
    doc.text('VEHICLE & FLEET INFORMATION', 14, 52);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text([
      `Vehicle Number:  ${activeVehicle.vehicleNumber}`,
      `Vehicle Type:    ${activeVehicle.type}`,
      `Owner Name:      ${activeVehicle.ownerName}`
    ], 14, 60);

    doc.text([
      `Driver Name:     ${activeVehicle.driverName}`,
      `Driver Mobile:   ${activeVehicle.driverPhone}`,
      `Statement Month: ${monthName}`
    ], 120, 60);

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

    // Transaction list table
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TRANSACTION LEDGER DETAILS', 14, 118);

    const tableRows = filteredTxs.map((t, idx) => [
      idx + 1,
      t.date,
      t.category,
      t.wasPending ? `${t.paymentMode} (Clrd)` : t.paymentMode,
      t.description || '-',
      t.type === 'income' ? formatPDFCurrency(t.amount) : '',
      t.type === 'expense' ? formatPDFCurrency(t.amount) : ''
    ]);

    autoTable(doc, {
      startY: 122,
      head: [['Sr.', 'Date', 'Category', 'Mode', 'Description', 'Income (+)', 'Expense (-)']],
      body: tableRows,
      headStyles: {
        fillColor: [15, 17, 26],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 22 },
        2: { cellWidth: 35 },
        3: { cellWidth: 18 },
        4: { cellWidth: 62 },
        5: { halign: 'right', textColor: [20, 110, 80] },
        6: { halign: 'right', textColor: [180, 40, 40] }
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    // Signature Area at the bottom
    const finalY = (doc as any).lastAutoTable.finalY + 25;
    if (finalY < 260) {
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
      csvRows.push(`${idx + 1},${t.date},${catEscaped},${t.paymentMode},${descEscaped},${incomeVal},${expenseVal}`);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Monthly Statement Reports</h1>
          <p className="page-subtitle">Download professional accounting PDF ledgers for drivers, owners, and tax audits.</p>
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
        <div className="empty-state">
          <Truck className="empty-state-icon" size={60} />
          <div className="empty-state-title">Select a Vehicle to Compile Statement</div>
          <p className="empty-state-desc">Choose a vehicle and matching billing cycle month to preview and download statements.</p>
        </div>
      ) : filteredTxs.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ border: 'none', padding: '40px' }}>
            <AlertCircle className="empty-state-icon" size={40} />
            <div className="empty-state-title">No transactions in {getMonthName(selectedMonth)}</div>
            <p className="empty-state-desc">We couldn't find any financial entries registered for {activeVehicle?.vehicleNumber || ''} during this month. Try recording transactions in the Ledger tab first.</p>
          </div>
        </div>
      ) : (
        <div className="report-preview-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
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
            <div className="report-profile-grid">
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '6px' }}>Vehicle & Operator</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>{activeVehicle?.vehicleNumber || ''}</div>
                <div style={{ color: '#475569', fontSize: '0.85rem', marginTop: '4px' }}>Type: {activeVehicle?.type || ''}</div>
                <div style={{ color: '#475569', fontSize: '0.85rem' }}>Owner: {activeVehicle?.ownerName || ''}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '6px' }}>Driver Details</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>{activeVehicle?.driverName || ''}</div>
                <div style={{ color: '#475569', fontSize: '0.85rem', marginTop: '4px' }}>Mobile: {activeVehicle?.driverPhone || ''}</div>
              </div>
            </div>

            {/* Internal summary cards */}
            <div className="report-sheet-summary-grid">
              <div className="report-sheet-summary-box">
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Gross Income</span>
                <div className="report-sheet-summary-value text-dark-success">{formatCurrency(summary.income)}</div>
              </div>
              <div className="report-sheet-summary-box">
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Expenses</span>
                <div className="report-sheet-summary-value text-dark-danger">{formatCurrency(summary.expense)}</div>
              </div>
              <div className="report-sheet-summary-box" style={{ background: summary.balance >= 0 ? '#f0fdf4' : '#fef2f2', borderColor: summary.balance >= 0 ? '#bbf7d0' : '#fecaca' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Net Margin Balance</span>
                <div className={`report-sheet-summary-value ${summary.balance >= 0 ? 'text-dark-success' : 'text-dark-danger'}`}>{formatCurrency(summary.balance)}</div>
              </div>
            </div>

            {/* Table */}
            <table className="custom-table" style={{ background: 'transparent' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>Sr.</th>
                  <th style={{ width: '100px' }}>Date</th>
                  <th style={{ width: '150px' }}>Category</th>
                  <th style={{ width: '80px' }}>Mode</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right', width: '120px' }}>Income (+)</th>
                  <th style={{ textAlign: 'right', width: '120px' }}>Expense (-)</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxs.map((t, idx) => (
                  <tr key={t.id}>
                    <td>{idx + 1}</td>
                    <td>{t.date}</td>
                    <td>
                      <span className={`badge ${t.type === 'income' ? 'success' : 'danger'}`} style={{ fontSize: '0.7rem' }}>
                        {t.category}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>{t.paymentMode}</span>
                        {t.wasPending && (
                          <span 
                            style={{ 
                              color: '#15803d', 
                              fontWeight: 'bold',
                              fontSize: '0.85rem'
                            }} 
                            title="Originally Pending, now Cleared"
                          >
                            ✓
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#475569' }}>{t.description || '-'}</td>
                    <td style={{ textAlign: 'right' }} className="text-dark-success">
                      {t.type === 'income' ? formatCurrency(t.amount) : ''}
                    </td>
                    <td style={{ textAlign: 'right' }} className="text-dark-danger">
                      {t.type === 'expense' ? formatCurrency(t.amount) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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
    </div>
  );
};
