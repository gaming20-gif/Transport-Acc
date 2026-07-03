import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Search, 
  Download, 
  Eye, 
  Printer, 
  Navigation, 
  FileText,
  Paperclip
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Vehicle, Trip, TripExpense } from '../types';
import { 
  getTrips, 
  addTrip, 
  updateTrip, 
  deleteTrip,
  generateNextTripNumber,
  syncTripTransactions
} from '../utils/storage';

interface TripsProps {
  vehicles: Vehicle[];
  refreshData: () => void;
}

export const Trips: React.FC<TripsProps> = ({ vehicles, refreshData }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  
  // Search & filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDate, setFilterDate] = useState('');

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleId, setVehicleId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [ton, setTon] = useState(0);
  const [ratePerTon, setRatePerTon] = useState(0);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [status, setStatus] = useState<'Running' | 'Completed' | 'Cancelled'>('Running');
  const [remarks, setRemarks] = useState('');

  // Income states
  const [freightCharges, setFreightCharges] = useState(0);

  // Expense dynamic list state
  const [tripExpenses, setTripExpenses] = useState<TripExpense[]>([]);


  // Payment states
  const [advanceReceived, setAdvanceReceived] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<'Pending' | 'Partial' | 'Paid'>('Pending');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Bank' | 'UPI' | 'Pending'>('Pending');
  const [paymentDate, setPaymentDate] = useState('');

  // Evidence attachment
  const [evidence, setEvidence] = useState<string>('');
  const [evidenceName, setEvidenceName] = useState<string>('');

  // Preview evidence overlay
  const [previewEvidence, setPreviewEvidence] = useState<string | null>(null);
  const [previewEvidenceName, setPreviewEvidenceName] = useState<string | null>(null);

  // Load Trips
  useEffect(() => {
    loadTripsData();
  }, []);

  const loadTripsData = async () => {
    const t = await getTrips();
    setTrips(t);
  };

  // Sync freight base calculation
  useEffect(() => {
    if (ton > 0 && ratePerTon > 0) {
      setFreightCharges(ton * ratePerTon);
    }
  }, [ton, ratePerTon]);

  // Auto-sync payment status based on totalIncome and advanceReceived
  useEffect(() => {
    const currentTotal = freightCharges;
    if (advanceReceived === 0) {
      setPaymentStatus('Pending');
      setPaymentMode('Pending');
    } else if (advanceReceived > 0 && advanceReceived < currentTotal) {
      setPaymentStatus('Partial');
      if (paymentMode === 'Pending') {
        setPaymentMode('UPI');
      }
    } else if (advanceReceived >= currentTotal) {
      setPaymentStatus('Paid');
      if (paymentMode === 'Pending') {
        setPaymentMode('UPI');
      }
    }
  }, [advanceReceived, freightCharges, paymentMode]);

  // Extract unique lists for master select options
  const driversList = Array.from(new Set(vehicles.map(v => v.driverName).filter(Boolean)));
  const customersList = Array.from(new Set(trips.map(t => t.customerName).filter(Boolean)));

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setVehicleId('');
    setDriverName('');
    setCustomerName('');
    setProduct('');
    setQuantity(1);
    setTon(0);
    setRatePerTon(0);
    setFromLocation('');
    setToLocation('');
    setMobileNumber('');
    setStatus('Running');
    setRemarks('');

    setFreightCharges(0);

    setTripExpenses([]);


    setAdvanceReceived(0);
    setPaymentStatus('Pending');
    setPaymentMode('Pending');
    setPaymentDate('');
    setEvidence('');
    setEvidenceName('');
  };

  // Calculations helper
  const totalIncome = freightCharges;
  const totalExpense = tripExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = totalIncome - totalExpense;
  const pendingAmount = Math.max(0, totalIncome - advanceReceived);

  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert('File size exceeds 1MB limit. Please upload a smaller receipt file.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        setEvidence(result);
        setEvidenceName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) {
      alert('Please select a vehicle registration number!');
      return;
    }

    const tripNum = await generateNextTripNumber();

    const newTrip = await addTrip({
      tripNumber: tripNum,
      date,
      vehicleId,
      driverName: driverName.trim(),
      customerName: customerName.trim(),
      product: product.trim(),
      quantity,
      ton,
      ratePerTon,
      fromLocation: fromLocation.trim(),
      toLocation: toLocation.trim(),
      mobileNumber: mobileNumber.trim(),
      status,
      remarks: remarks.trim(),
      freightCharges,
      totalIncome,
      expenses: tripExpenses,
      totalExpense,
      netProfit,
      advanceReceived,
      paymentStatus,
      paymentMode,
      paymentDate,
      pendingAmount,
      evidence,
      evidenceName
    });

    if (newTrip) {
      await syncTripTransactions(newTrip);
    }

    setIsAddModalOpen(false);
    resetForm();
    await loadTripsData();
    refreshData();
  };

  const openEditModal = (trip: Trip) => {
    setCurrentTrip(trip);
    setDate(trip.date);
    setVehicleId(trip.vehicleId);
    setDriverName(trip.driverName);
    setCustomerName(trip.customerName);
    setProduct(trip.product);
    setQuantity(trip.quantity);
    setTon(trip.ton);
    setRatePerTon(trip.ratePerTon);
    setFromLocation(trip.fromLocation);
    setToLocation(trip.toLocation);
    setMobileNumber(trip.mobileNumber);
    setStatus(trip.status);
    setRemarks(trip.remarks);

    setFreightCharges(trip.freightCharges);

    setTripExpenses(trip.expenses || []);


    setAdvanceReceived(trip.advanceReceived);
    setPaymentStatus(trip.paymentStatus);
    setPaymentMode(trip.paymentMode);
    setPaymentDate(trip.paymentDate);
    setEvidence(trip.evidence || '');
    setEvidenceName(trip.evidenceName || '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrip) return;

    const updatedTripData = {
      ...currentTrip,
      date,
      vehicleId,
      driverName: driverName.trim(),
      customerName: customerName.trim(),
      product: product.trim(),
      quantity,
      ton,
      ratePerTon,
      fromLocation: fromLocation.trim(),
      toLocation: toLocation.trim(),
      mobileNumber: mobileNumber.trim(),
      status,
      remarks: remarks.trim(),
      freightCharges,
      totalIncome,
      expenses: tripExpenses,
      totalExpense,
      netProfit,
      advanceReceived,
      paymentStatus,
      paymentMode,
      paymentDate,
      pendingAmount,
      evidence,
      evidenceName
    };

    await updateTrip(updatedTripData);
    await syncTripTransactions(updatedTripData);

    setIsEditModalOpen(false);
    setCurrentTrip(null);
    resetForm();
    await loadTripsData();
    refreshData();
  };

  const handleDeleteTrip = async (id: string, num: string) => {
    if (window.confirm(`Are you sure you want to delete Trip ${num}? All corresponding ledger entries will be permanently removed.`)) {
      await deleteTrip(id);
      await loadTripsData();
      refreshData();
    }
  };

  const openViewModal = (trip: Trip) => {
    setCurrentTrip(trip);
    setIsViewModalOpen(true);
  };

  // Filters logic
  const filteredTrips = trips.filter(t => {
    const searchString = `${t.tripNumber} ${t.driverName} ${t.customerName} ${t.fromLocation} ${t.toLocation}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    
    const matchesVehicle = filterVehicle === 'All' || t.vehicleId === filterVehicle;
    const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
    const matchesDate = !filterDate || t.date === filterDate;
    
    return matchesSearch && matchesVehicle && matchesStatus && matchesDate;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredTrips.length === 0) return;
    const csvRows = [];
    csvRows.push('Trip Number,Trip Date,Vehicle Registration,Driver,Customer,From,To,Total Income,Total Expenses,Net Profit,Payment Status,Trip Status');
    
    filteredTrips.forEach(t => {
      const vehicle = vehicles.find(v => v.id === t.vehicleId);
      const vehicleNumber = vehicle ? vehicle.vehicleNumber : 'Deleted Vehicle';
      csvRows.push([
        t.tripNumber,
        t.date,
        `"${vehicleNumber}"`,
        `"${t.driverName}"`,
        `"${t.customerName}"`,
        `"${t.fromLocation}"`,
        `"${t.toLocation}"`,
        t.totalIncome,
        t.totalExpense,
        t.netProfit,
        t.paymentStatus,
        t.status
      ].join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trips_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // PDF Export
  const handleExportPDF = (trip: Trip) => {
    const doc = new jsPDF();
    const vehicle = vehicles.find(v => v.id === trip.vehicleId);
    const vehicleNumber = vehicle ? vehicle.vehicleNumber : 'Deleted Vehicle';

    // Branding Header
    doc.setFillColor(15, 17, 26);
    doc.rect(0, 0, 210, 36, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('TRANSPORT TRIP SHEET LOG', 14, 16);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 26);
    doc.text(`Trip Number: ${trip.tripNumber}`, 150, 16);
    doc.text(`Trip Date: ${trip.date}`, 150, 26);

    // Section 1: Trip Details
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.text('TRIP DETAILS', 14, 46);
    doc.line(14, 48, 196, 48);

    doc.setFontSize(9.5);
    doc.text([
      `Vehicle Number:  ${vehicleNumber}`,
      `Driver Assigned: ${trip.driverName}`,
      `Customer Party:  ${trip.customerName}`,
      `Mobile Contact:  ${trip.mobileNumber}`,
    ], 14, 55);

    doc.text([
      `From Location:   ${trip.fromLocation}`,
      `To Location:     ${trip.toLocation}`,
      `Product Loaded:  ${trip.product}`,
      `Quantity Log:    ${trip.quantity} ton (${formatCurrency(trip.ratePerTon)}/ton)`,
    ], 110, 55);

    // Section 2: Financial Summary Table
    doc.setFontSize(11);
    doc.text('FINANCIAL MATRIX', 14, 82);
    
    const incomes = [
      ['Freight Base Charges', formatCurrency(trip.freightCharges)],
    ];

    const expenses = (trip.expenses || []).map(e => [
      `${e.category} (${e.date.substring(5)})${e.remarks ? ` - ${e.remarks}` : ''}`,
      formatCurrency(e.amount)
    ]);

    const maxRows = Math.max(incomes.length, expenses.length);
    const financialData = [];

    for (let i = 0; i < maxRows; i++) {
      const incomeCol = incomes[i] || ['', ''];
      const expenseCol = expenses[i] || ['', ''];
      financialData.push([
        incomeCol[0],
        incomeCol[1],
        expenseCol[0],
        expenseCol[1]
      ]);
    }

    financialData.push([
      'TOTAL INCOMES',
      formatCurrency(trip.totalIncome),
      'TOTAL EXPENSES',
      formatCurrency(trip.totalExpense)
    ]);

    autoTable(doc, {
      startY: 86,
      head: [['Income Source', 'Amount', 'Expense Source', 'Amount']],
      body: financialData,
      headStyles: { fillColor: [15, 17, 26], textColor: [255, 255, 255], fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      theme: 'grid',
      columnStyles: {
        1: { halign: 'right' },
        3: { halign: 'right' }
      }
    });

    // Net Summary Panel
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, finalY, 182, 22, 'F');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    
    const pendingText = trip.pendingAmount && trip.pendingAmount > 0 ? `  |  Pending Balance: ${formatCurrency(trip.pendingAmount)}` : '';
    doc.text(`Advance Received: ${formatCurrency(trip.advanceReceived)}  (${trip.paymentStatus.toUpperCase()} - ${trip.paymentMode})${pendingText}`, 20, finalY + 8);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`NET TRIP PROFIT: ${formatCurrency(trip.netProfit)}`, 20, finalY + 16);

    // Signatures
    doc.line(14, finalY + 45, 70, finalY + 45);
    doc.line(140, finalY + 45, 196, finalY + 45);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Driver Signature', 14, finalY + 50);
    doc.text('Accountant/Manager Approval', 140, finalY + 50);

    doc.save(`Trip_Sheet_${trip.tripNumber}.pdf`);
  };

  const handlePrint = (trip: Trip) => {
    const vehicle = vehicles.find(v => v.id === trip.vehicleId);
    const vehicleNumber = vehicle ? vehicle.vehicleNumber : 'Deleted Vehicle';
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Trip Sheet - ${trip.tripNumber}</title>
          <style>
            body { font-family: system-ui, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; }
            .header { border-bottom: 2px solid #cbd5e1; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
            .title { font-size: 24px; font-weight: 800; }
            .meta { text-align: right; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 15px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .table-wrap { display: flex; gap: 40px; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; }
            th { text-align: left; background-color: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; }
            td { padding: 8px; border: 1px solid #cbd5e1; }
            .total-row { font-weight: 700; background-color: #f8fafc; }
            .summary-box { background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin-top: 30px; display: flex; justify-content: space-between; font-weight: 700; font-size: 16px; }
            .footer { margin-top: 80px; display: flex; justify-content: space-between; }
            .signature { border-top: 1px dashed #94a3b8; width: 200px; text-align: center; padding-top: 8px; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">TRANSPORT TRIP SHEET</div>
              <div>Vehicle Account Statement</div>
            </div>
            <div class="meta">
              <div>Trip Number: <strong>${trip.tripNumber}</strong></div>
              <div>Date: <strong>${trip.date}</strong></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Trip Information</div>
            <div class="grid">
              <div>
                <div>Vehicle Number: <strong>${vehicleNumber}</strong></div>
                <div>Driver: <strong>${trip.driverName}</strong></div>
                <div>Customer / Party: <strong>${trip.customerName}</strong></div>
                <div>Product: <strong>${trip.product}</strong></div>
              </div>
              <div>
                <div>From Location: <strong>${trip.fromLocation}</strong></div>
                <div>To Location: <strong>${trip.toLocation}</strong></div>
                <div>Loaded Load: <strong>${trip.ton} ton (${formatCurrency(trip.ratePerTon)}/ton)</strong></div>
                <div>Quantity: <strong>${trip.quantity} trips</strong></div>
              </div>
            </div>
          </div>



          <div class="section">
            <div class="section-title">Financial Statement</div>
            <div class="table-wrap">
              <div style="flex: 1;">
                <h3>Incomes</h3>
                <table>
                  <tr><th>Income Details</th><th>Amount</th></tr>
                  <tr><td>Freight Charges</td><td>${formatCurrency(trip.freightCharges)}</td></tr>
                  <tr class="total-row"><td>TOTAL INCOME</td><td>${formatCurrency(trip.totalIncome)}</td></tr>
                </table>
              </div>
              <div style="flex: 1;">
                <h3>Expenses</h3>
                <table>
                  <tr><th>Date</th><th>Expense / Category</th><th>Notes</th><th>Amount</th></tr>
                  ${(trip.expenses || []).map(e => `
                    <tr>
                      <td style="font-size: 11px; color: #555;">${e.date}</td>
                      <td><strong>${e.category}</strong></td>
                      <td style="font-size: 11px; color: #555;">${e.remarks || '-'}</td>
                      <td>${formatCurrency(e.amount)}</td>
                    </tr>
                  `).join('')}
                  <tr class="total-row"><td colspan="3">TOTAL EXPENSES</td><td>${formatCurrency(trip.totalExpense)}</td></tr>
                </table>
              </div>
            </div>
          </div>

          <div class="summary-box">
            <div>
              Advance Received: ${formatCurrency(trip.advanceReceived)} (${trip.paymentStatus} - ${trip.paymentMode})
              ${trip.pendingAmount && trip.pendingAmount > 0 ? `<br/><span style="color:#ef4444;font-size:14px;">Pending Balance: ${formatCurrency(trip.pendingAmount)}</span>` : ''}
            </div>
            <div>NET PROFIT: ${formatCurrency(trip.netProfit)}</div>
          </div>

          <div class="footer">
            <div class="signature">Driver Signature</div>
            <div class="signature">Manager/Accountant Approval</div>
          </div>

          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header and Add Button */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>Trip Registers</h1>
          <p className="page-subtitle">Log location-to-location trip details, diesel consumption, expenses, and track trip-wise profit margins.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={20} />
          New Trip Log
        </button>
      </div>

      {/* Filter and Search controls */}
      <div className="card filter-bar">
        <div className="filter-group">
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Search logs</label>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              className="form-control" 
              style={{ paddingLeft: '36px', fontSize: '0.85rem' }} 
              placeholder="Search driver, customer, locations..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="filter-group">
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Select Vehicle</label>
          <select 
            className="form-select" 
            style={{ fontSize: '0.85rem' }} 
            value={filterVehicle} 
            onChange={e => setFilterVehicle(e.target.value)}
          >
            <option value="All">All Vehicles</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.vehicleNumber}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Trip Status</label>
          <select 
            className="form-select" 
            style={{ fontSize: '0.85rem' }} 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Running">Running</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Filter Date</label>
          <input 
            type="date" 
            className="form-control" 
            style={{ fontSize: '0.85rem' }} 
            value={filterDate} 
            onChange={e => setFilterDate(e.target.value)} 
          />
        </div>

        {(searchTerm || filterVehicle !== 'All' || filterStatus !== 'All' || filterDate) && (
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ height: '38px' }} 
            onClick={() => { setSearchTerm(''); setFilterVehicle('All'); setFilterStatus('All'); setFilterDate(''); }}
          >
            Clear Filters
          </button>
        )}

        {filteredTrips.length > 0 && (
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ height: '38px', border: '1px solid var(--color-success)', color: 'var(--color-success)', marginLeft: 'auto' }} 
            onClick={handleExportCSV}
          >
            <Download size={16} />
            Export CSV
          </button>
        )}
      </div>

      {/* Main logs display */}
      <div className="card">
        {filteredTrips.length === 0 ? (
          <div className="empty-state" style={{ border: 'none', padding: '40px' }}>
            <Navigation className="empty-state-icon" size={60} />
            <div className="empty-state-title">No Trip Logs Found</div>
            <p className="empty-state-desc">Register a new trip log to start tracking location balances, fuel mileage, and trip profitability statements.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Trip No.</th>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Locations</th>
                  <th>Driver & Customer</th>
                  <th>Net Profit</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center', width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map(t => {
                  const vehicle = vehicles.find(v => v.id === t.vehicleId);
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 700 }} className="amount-income">{t.tripNumber}</td>
                      <td>{t.date}</td>
                      <td style={{ fontWeight: 600 }}>{vehicle ? vehicle.vehicleNumber : 'Deleted Vehicle'}</td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <div>{t.fromLocation}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>➜ {t.toLocation}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <div>Dvr: <strong>{t.driverName}</strong></div>
                        <div style={{ color: 'var(--text-secondary)' }}>Cust: {t.customerName}</div>
                      </td>
                      <td className={t.netProfit >= 0 ? 'amount-income' : 'amount-expense'} style={{ fontWeight: 700 }}>
                        {formatCurrency(t.netProfit)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className={`badge ${t.paymentStatus === 'Paid' ? 'success' : (t.paymentStatus === 'Partial' ? 'warning' : 'danger')}`} style={{ fontSize: '0.7rem', width: 'fit-content' }}>
                            {t.paymentStatus}
                          </span>
                          {t.pendingAmount && t.pendingAmount > 0 ? (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 600 }} title="Pending Balance">
                              {formatCurrency(t.pendingAmount)} Pending
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${t.status === 'Completed' ? 'success' : (t.status === 'Running' ? 'info' : 'danger')}`} style={{ fontSize: '0.7rem' }}>
                          {t.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button className="btn btn-secondary btn-sm" style={{ padding: '6px' }} onClick={() => openViewModal(t)} title="View Detail Details">
                            <Eye size={12} />
                          </button>
                          <button className="btn btn-secondary btn-sm" style={{ padding: '6px' }} onClick={() => openEditModal(t)} title="Edit Trip">
                            <Edit2 size={12} />
                          </button>
                          <button className="btn btn-outline-danger btn-sm" style={{ padding: '6px' }} onClick={() => handleDeleteTrip(t.id, t.tripNumber)} title="Delete Trip">
                            <Trash2 size={12} />
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

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Navigation size={20} className="amount-income" />
                Record New Trip Log
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => { setIsAddModalOpen(false); resetForm(); }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flexGrow: 1, minHeight: 0 }}>
              <div className="modal-body">
                {/* Section 1: Trip Details */}
                <h4 style={{ color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '16px' }}>Trip Profile Info</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Trip Date *</label>
                    <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Registration Number *</label>
                    <select className="form-select" value={vehicleId} onChange={e => setVehicleId(e.target.value)} required>
                      <option value="">-- Choose Vehicle --</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.driverName})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Driver Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Enter driver name" 
                      value={driverName} 
                      onChange={e => setDriverName(e.target.value)}
                      list="add-drivers-list"
                    />
                    <datalist id="add-drivers-list">
                      {driversList.map(d => <option key={d} value={d} />)}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer / Party Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Enter customer name" 
                      value={customerName} 
                      onChange={e => setCustomerName(e.target.value)}
                      list="add-customers-list"
                    />
                    <datalist id="add-customers-list">
                      {customersList.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Product Loaded</label>
                    <input type="text" className="form-control" placeholder="E.g. Coal, Cement, Sand" value={product} onChange={e => setProduct(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Driver Contact Mobile</label>
                    <input type="tel" className="form-control" placeholder="E.g. 9876543210" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} />
                  </div>
                </div>

                <div className="form-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <div className="form-group">
                    <label className="form-label">From Location</label>
                    <input type="text" className="form-control" placeholder="Origin" value={fromLocation} onChange={e => setFromLocation(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">To Location</label>
                    <input type="text" className="form-control" placeholder="Destination" value={toLocation} onChange={e => setToLocation(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tonnage Load</label>
                    <input type="number" step="any" min="0" className="form-control" placeholder="Tons" value={ton || ''} onChange={e => setTon(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rate / Ton (INR)</label>
                    <input type="number" step="any" min="0" className="form-control" placeholder="Rate" value={ratePerTon || ''} onChange={e => setRatePerTon(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>

                {/* Section 2: Incomes */}
                <h4 style={{ color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '16px', marginTop: '24px' }}>Incomes Booking</h4>
                <div className="form-row" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="form-group">
                    <label className="form-label">Freight charges</label>
                    <input type="number" min="0" className="form-control" value={freightCharges || ''} onChange={e => setFreightCharges(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-success)', marginBottom: '12px' }}>
                  Total Trip Earnings: {formatCurrency(totalIncome)}
                </div>

                {/* Section 3: Expenses */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                  <h4 style={{ color: 'var(--accent-primary)', margin: 0 }}>Trip Expenses Details</h4>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => {
                      setTripExpenses([
                        ...tripExpenses, 
                        {
                          id: `exp-${Math.random().toString(36).substring(2, 6)}`,
                          date: date,
                          category: 'Diesel',
                          amount: 0,
                          remarks: ''
                        }
                      ]);
                    }}
                    style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={12} />
                    Add Expense Row
                  </button>
                </div>

                {tripExpenses.length === 0 ? (
                  <div style={{ padding: '20px', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.85rem' }}>
                    No expenses added to this trip yet. Click "+ Add Expense Row" to log diesel, tolls, salary, etc.
                  </div>
                ) : (
                  <div className="table-container" style={{ marginBottom: '16px', maxHeight: '300px', overflowY: 'auto' }}>
                    <table className="custom-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '120px' }}>Date</th>
                          <th style={{ width: '180px' }}>Category</th>
                          <th>Remarks / Bunk / plaza</th>
                          <th style={{ width: '120px' }}>Amount (₹)</th>
                          <th style={{ width: '50px', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {tripExpenses.map((exp, index) => (
                          <tr key={exp.id}>
                            <td style={{ padding: '4px' }}>
                              <input 
                                type="date" 
                                className="form-control" 
                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                value={exp.date} 
                                onChange={e => {
                                  const updated = [...tripExpenses];
                                  updated[index].date = e.target.value;
                                  setTripExpenses(updated);
                                }} 
                                required
                              />
                            </td>
                            <td style={{ padding: '4px' }}>
                              <select 
                                className="form-select" 
                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                value={exp.category}
                                onChange={e => {
                                  const updated = [...tripExpenses];
                                  updated[index].category = e.target.value as any;
                                  setTripExpenses(updated);
                                }}
                                required
                              >
                                <option value="Diesel">Diesel</option>
                                <option value="Toll Tax">Toll Tax</option>
                                <option value="Driver Advance">Driver Advance</option>
                                <option value="Driver Salary">Driver Salary</option>
                                <option value="Helper Expense">Helper Expense</option>
                                <option value="Loading Expense">Loading Expense</option>
                                <option value="Unloading Expense">Unloading Expense</option>
                                <option value="Parking">Parking</option>
                                <option value="Repair & Maintenance">Repair & Maint</option>
                                <option value="Tyre Expense">Tyre Expense</option>
                                <option value="Puncture">Puncture</option>
                                <option value="Food Expense">Food Expense</option>
                                <option value="Miscellaneous Expense">Misc Expense</option>
                              </select>
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input 
                                type="text" 
                                className="form-control" 
                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                placeholder="Details..." 
                                value={exp.remarks} 
                                onChange={e => {
                                  const updated = [...tripExpenses];
                                  updated[index].remarks = e.target.value;
                                  setTripExpenses(updated);
                                }} 
                              />
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input 
                                type="number" 
                                min="0"
                                className="form-control" 
                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                placeholder="Amount" 
                                value={exp.amount || ''} 
                                onChange={e => {
                                  const updated = [...tripExpenses];
                                  updated[index].amount = parseFloat(e.target.value) || 0;
                                  setTripExpenses(updated);
                                }} 
                                required
                              />
                            </td>
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <button 
                                type="button" 
                                className="btn btn-outline-danger btn-sm" 
                                style={{ padding: '4px' }}
                                onClick={() => {
                                  setTripExpenses(tripExpenses.filter(item => item.id !== exp.id));
                                }}
                                title="Remove expense"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-danger)', marginBottom: '16px' }}>
                  Total Trip Expenses: {formatCurrency(totalExpense)}
                </div>



                {/* Section 5: Payment details */}
                <h4 style={{ color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '16px', marginTop: '16px' }}>Billing & Payments</h4>
                <div className="form-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                  <div className="form-group">
                    <label className="form-label">Advance Received</label>
                    <input type="number" min="0" className="form-control" value={advanceReceived || ''} onChange={e => setAdvanceReceived(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Status</label>
                    <select className="form-select" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as any)}>
                      <option value="Pending">Pending</option>
                      <option value="Partial">Partial</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select className="form-select" value={paymentMode} onChange={e => setPaymentMode(e.target.value as any)}>
                      <option value="Pending">Pending / Unpaid</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank Transfer</option>
                      <option value="UPI">UPI / Fastag</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Date</label>
                    <input type="date" className="form-control" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pending Balance</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ color: 'var(--color-danger)', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.05)' }} 
                      value={formatCurrency(pendingAmount)} 
                      disabled 
                    />
                  </div>
                </div>

                <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Trip Status</label>
                    <select className="form-select" value={status} onChange={e => setStatus(e.target.value as any)}>
                      <option value="Running">Running</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Upload Evidence / Receipt (Optional - Max 1MB)</label>
                    <input type="file" className="form-control" accept="image/*,application/pdf" onChange={handleEvidenceUpload} />
                    {evidence && <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', marginTop: '4px' }}>✓ Attached: {evidenceName}</div>}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Remarks / Notes</label>
                  <textarea className="form-control" style={{ height: '60px' }} placeholder="Add trip notes here..." value={remarks} onChange={e => setRemarks(e.target.value)} />
                </div>

                {/* Net Margin Panel */}
                <div style={{ 
                  marginTop: '24px', 
                  padding: '16px', 
                  borderRadius: 'var(--border-radius-sm)', 
                  border: '1px solid var(--border-color)',
                  background: netProfit >= 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Estimated Net Profit:</span>
                  <span className={netProfit >= 0 ? 'amount-income' : 'amount-expense'} style={{ fontSize: '1.25rem' }}>{formatCurrency(netProfit)}</span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsAddModalOpen(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Trip Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && currentTrip && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit2 size={20} className="amount-income" />
                Modify Trip: {currentTrip.tripNumber}
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => { setIsEditModalOpen(false); resetForm(); setCurrentTrip(null); }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flexGrow: 1, minHeight: 0 }}>
              <div className="modal-body">
                {/* Section 1: Trip Details */}
                <h4 style={{ color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '16px' }}>Trip Profile Info</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Trip Date *</label>
                    <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Registration Number *</label>
                    <select className="form-select" value={vehicleId} onChange={e => setVehicleId(e.target.value)} required>
                      <option value="">-- Choose Vehicle --</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.driverName})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Driver Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Enter driver name" 
                      value={driverName} 
                      onChange={e => setDriverName(e.target.value)}
                      list="edit-drivers-list"
                    />
                    <datalist id="edit-drivers-list">
                      {driversList.map(d => <option key={d} value={d} />)}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer / Party Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Enter customer name" 
                      value={customerName} 
                      onChange={e => setCustomerName(e.target.value)}
                      list="edit-customers-list"
                    />
                    <datalist id="edit-customers-list">
                      {customersList.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Product Loaded</label>
                    <input type="text" className="form-control" placeholder="E.g. Coal, Cement" value={product} onChange={e => setProduct(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Driver Contact Mobile</label>
                    <input type="tel" className="form-control" placeholder="E.g. 9876543210" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} />
                  </div>
                </div>

                <div className="form-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <div className="form-group">
                    <label className="form-label">From Location</label>
                    <input type="text" className="form-control" placeholder="Origin" value={fromLocation} onChange={e => setFromLocation(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">To Location</label>
                    <input type="text" className="form-control" placeholder="Destination" value={toLocation} onChange={e => setToLocation(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tonnage Load</label>
                    <input type="number" step="any" min="0" className="form-control" placeholder="Tons" value={ton || ''} onChange={e => setTon(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rate / Ton (INR)</label>
                    <input type="number" step="any" min="0" className="form-control" placeholder="Rate" value={ratePerTon || ''} onChange={e => setRatePerTon(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>

                {/* Section 2: Incomes */}
                <h4 style={{ color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '16px', marginTop: '24px' }}>Incomes Booking</h4>
                <div className="form-row" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="form-group">
                    <label className="form-label">Freight charges</label>
                    <input type="number" min="0" className="form-control" value={freightCharges || ''} onChange={e => setFreightCharges(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-success)', marginBottom: '12px' }}>
                  Total Trip Earnings: {formatCurrency(totalIncome)}
                </div>

                {/* Section 3: Expenses */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                  <h4 style={{ color: 'var(--accent-primary)', margin: 0 }}>Trip Expenses Details</h4>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => {
                      setTripExpenses([
                        ...tripExpenses, 
                        {
                          id: `exp-${Math.random().toString(36).substring(2, 6)}`,
                          date: date,
                          category: 'Diesel',
                          amount: 0,
                          remarks: ''
                        }
                      ]);
                    }}
                    style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={12} />
                    Add Expense Row
                  </button>
                </div>

                {tripExpenses.length === 0 ? (
                  <div style={{ padding: '20px', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.85rem' }}>
                    No expenses added to this trip yet. Click "+ Add Expense Row" to log diesel, tolls, salary, etc.
                  </div>
                ) : (
                  <div className="table-container" style={{ marginBottom: '16px', maxHeight: '300px', overflowY: 'auto' }}>
                    <table className="custom-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '120px' }}>Date</th>
                          <th style={{ width: '180px' }}>Category</th>
                          <th>Remarks / Bunk / plaza</th>
                          <th style={{ width: '120px' }}>Amount (₹)</th>
                          <th style={{ width: '50px', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {tripExpenses.map((exp, index) => (
                          <tr key={exp.id}>
                            <td style={{ padding: '4px' }}>
                              <input 
                                type="date" 
                                className="form-control" 
                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                value={exp.date} 
                                onChange={e => {
                                  const updated = [...tripExpenses];
                                  updated[index].date = e.target.value;
                                  setTripExpenses(updated);
                                }} 
                                required
                              />
                            </td>
                            <td style={{ padding: '4px' }}>
                              <select 
                                className="form-select" 
                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                value={exp.category}
                                onChange={e => {
                                  const updated = [...tripExpenses];
                                  updated[index].category = e.target.value as any;
                                  setTripExpenses(updated);
                                }}
                                required
                              >
                                <option value="Diesel">Diesel</option>
                                <option value="Toll Tax">Toll Tax</option>
                                <option value="Driver Advance">Driver Advance</option>
                                <option value="Driver Salary">Driver Salary</option>
                                <option value="Helper Expense">Helper Expense</option>
                                <option value="Loading Expense">Loading Expense</option>
                                <option value="Unloading Expense">Unloading Expense</option>
                                <option value="Parking">Parking</option>
                                <option value="Repair & Maintenance">Repair & Maint</option>
                                <option value="Tyre Expense">Tyre Expense</option>
                                <option value="Puncture">Puncture</option>
                                <option value="Food Expense">Food Expense</option>
                                <option value="Miscellaneous Expense">Misc Expense</option>
                              </select>
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input 
                                type="text" 
                                className="form-control" 
                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                placeholder="Details..." 
                                value={exp.remarks} 
                                onChange={e => {
                                  const updated = [...tripExpenses];
                                  updated[index].remarks = e.target.value;
                                  setTripExpenses(updated);
                                }} 
                              />
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input 
                                type="number" 
                                min="0"
                                className="form-control" 
                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                placeholder="Amount" 
                                value={exp.amount || ''} 
                                onChange={e => {
                                  const updated = [...tripExpenses];
                                  updated[index].amount = parseFloat(e.target.value) || 0;
                                  setTripExpenses(updated);
                                }} 
                                required
                              />
                            </td>
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <button 
                                type="button" 
                                className="btn btn-outline-danger btn-sm" 
                                style={{ padding: '4px' }}
                                onClick={() => {
                                  setTripExpenses(tripExpenses.filter(item => item.id !== exp.id));
                                }}
                                title="Remove expense"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-danger)', marginBottom: '16px' }}>
                  Total Trip Expenses: {formatCurrency(totalExpense)}
                </div>



                {/* Section 5: Payment details */}
                <h4 style={{ color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '16px', marginTop: '16px' }}>Billing & Payments</h4>
                <div className="form-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                  <div className="form-group">
                    <label className="form-label">Advance Received</label>
                    <input type="number" min="0" className="form-control" value={advanceReceived || ''} onChange={e => setAdvanceReceived(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Status</label>
                    <select className="form-select" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as any)}>
                      <option value="Pending">Pending</option>
                      <option value="Partial">Partial</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select className="form-select" value={paymentMode} onChange={e => setPaymentMode(e.target.value as any)}>
                      <option value="Pending">Pending / Unpaid</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank Transfer</option>
                      <option value="UPI">UPI / Fastag</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Date</label>
                    <input type="date" className="form-control" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pending Balance</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ color: 'var(--color-danger)', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.05)' }} 
                      value={formatCurrency(pendingAmount)} 
                      disabled 
                    />
                  </div>
                </div>

                <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Trip Status</label>
                    <select className="form-select" value={status} onChange={e => setStatus(e.target.value as any)}>
                      <option value="Running">Running</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Upload Evidence / Receipt (Optional - Max 1MB)</label>
                    <input type="file" className="form-control" accept="image/*,application/pdf" onChange={handleEvidenceUpload} />
                    {evidence && <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', marginTop: '4px' }}>✓ Attached: {evidenceName}</div>}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Remarks / Notes</label>
                  <textarea className="form-control" style={{ height: '60px' }} placeholder="Add trip notes..." value={remarks} onChange={e => setRemarks(e.target.value)} />
                </div>

                {/* Net Margin Panel */}
                <div style={{ 
                  marginTop: '24px', 
                  padding: '16px', 
                  borderRadius: 'var(--border-radius-sm)', 
                  border: '1px solid var(--border-color)',
                  background: netProfit >= 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Estimated Net Profit:</span>
                  <span className={netProfit >= 0 ? 'amount-income' : 'amount-expense'} style={{ fontSize: '1.25rem' }}>{formatCurrency(netProfit)}</span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsEditModalOpen(false); resetForm(); setCurrentTrip(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detailed View Modal */}
      {isViewModalOpen && currentTrip && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} className="amount-income" />
                Trip Sheet: {currentTrip.tripNumber}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handlePrint(currentTrip)} title="Print Trip Sheet">
                  <Printer size={14} />
                  Print
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => handleExportPDF(currentTrip)} title="Download PDF">
                  <Download size={14} />
                  PDF
                </button>
                <button className="btn btn-secondary btn-sm" style={{ padding: '6px' }} onClick={() => { setIsViewModalOpen(false); setCurrentTrip(null); }}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="modal-body" style={{ color: 'var(--text-primary)' }}>
              {/* Trip Metadata */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '20px' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Log Date & Vehicle</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>
                    {vehicles.find(v => v.id === currentTrip.vehicleId)?.vehicleNumber || 'Deleted Vehicle'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Date: {currentTrip.date}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status: <strong>{currentTrip.status}</strong></div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Driver & Customer</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '4px' }}>Driver: {currentTrip.driverName}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cust: {currentTrip.customerName}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Contact: {currentTrip.mobileNumber}</div>
                </div>
              </div>

              {/* Log Route details */}
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ROUTE & CARGO</div>
                <div style={{ fontWeight: 600, marginTop: '4px' }}>{currentTrip.fromLocation} ➜ {currentTrip.toLocation}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Cargo: {currentTrip.product} | Load: {currentTrip.ton} ton @ {formatCurrency(currentTrip.ratePerTon)}/ton ({currentTrip.quantity} trips)</div>
              </div>

              {/* Incomes & Expenses tables side-by-side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <h4 style={{ color: 'var(--color-success)', marginBottom: '8px' }}>Earnings / Incomes</h4>
                  <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}><td style={{ padding: '6px 0' }}>Freight Booking</td><td style={{ textAlign: 'right' }}>{formatCurrency(currentTrip.freightCharges)}</td></tr>
                      <tr style={{ fontWeight: 700 }}><td style={{ padding: '8px 0' }}>TOTAL INCOME</td><td style={{ textAlign: 'right', color: 'var(--color-success)' }}>{formatCurrency(currentTrip.totalIncome)}</td></tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <h4 style={{ color: 'var(--color-danger)', marginBottom: '8px' }}>Expenses Details</h4>
                  {(!currentTrip.expenses || currentTrip.expenses.length === 0) ? (
                    <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No expenses logged.
                    </div>
                  ) : (
                    <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                      <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                            <th style={{ textAlign: 'left', padding: '4px' }}>Date</th>
                            <th style={{ textAlign: 'left', padding: '4px' }}>Category</th>
                            <th style={{ textAlign: 'left', padding: '4px' }}>Notes</th>
                            <th style={{ textAlign: 'right', padding: '4px' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentTrip.expenses.map((exp) => (
                            <tr key={exp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <td style={{ padding: '4px', color: 'var(--text-secondary)' }}>{exp.date}</td>
                              <td style={{ padding: '4px', fontWeight: 600 }}>{exp.category}</td>
                              <td style={{ padding: '4px', color: 'var(--text-secondary)', fontSize: '0.75rem', maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={exp.remarks}>{exp.remarks || '-'}</td>
                              <td style={{ padding: '4px', textAlign: 'right', color: 'var(--color-danger)' }}>{formatCurrency(exp.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, padding: '8px 0', borderTop: '1px solid var(--border-color)', marginTop: '8px', fontSize: '0.85rem' }}>
                    <span>TOTAL EXPENSES:</span>
                    <span style={{ color: 'var(--color-danger)' }}>{formatCurrency(currentTrip.totalExpense)}</span>
                  </div>
                </div>
              </div>

              {/* Remarks, Billing, and Evidence */}
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '8px', fontSize: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '8px' }}>
                  <div>Billing Status: <strong>{currentTrip.paymentStatus}</strong> ({currentTrip.paymentMode})</div>
                  <div>Advance Received: <strong>{formatCurrency(currentTrip.advanceReceived)}</strong></div>
                  <div>Pending Balance: <strong style={{ color: 'var(--color-danger)' }}>{formatCurrency(currentTrip.pendingAmount || 0)}</strong></div>
                </div>
                {currentTrip.remarks && <div style={{ color: 'var(--text-secondary)' }}>Remarks: {currentTrip.remarks}</div>}
                
                {currentTrip.evidence && (
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Supporting Bill Document:</span>
                    <button 
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => {
                        setPreviewEvidence(currentTrip.evidence || null);
                        setPreviewEvidenceName(currentTrip.evidenceName || null);
                      }}
                    >
                      <Paperclip size={12} />
                      View Attached Bill ({currentTrip.evidenceName})
                    </button>
                  </div>
                )}
              </div>

              {/* Net profit Banner */}
              <div style={{ 
                marginTop: '20px', 
                padding: '14px', 
                borderRadius: '8px', 
                background: currentTrip.netProfit >= 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 700,
                fontSize: '1.1rem'
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>Net Profit / Margin:</span>
                <span className={currentTrip.netProfit >= 0 ? 'amount-income' : 'amount-expense'}>{formatCurrency(currentTrip.netProfit)}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => { setIsViewModalOpen(false); setCurrentTrip(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Preview Modal Overlay */}
      {previewEvidence && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Eye size={20} className="amount-income" />
                Attachment Preview: {previewEvidenceName}
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
                    download={previewEvidenceName || 'trip_document'} 
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
                  download={previewEvidenceName || 'trip_receipt'} 
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
