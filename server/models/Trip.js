const mongoose = require('mongoose');

const tripExpenseSchema = new mongoose.Schema({
  id: { type: String, required: true },
  date: { type: String, required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  remarks: { type: String, default: '' }
});

const tripSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  tripNumber: { type: String, required: true },
  date: { type: String, required: true },
  vehicleId: { type: String, required: true },
  driverName: { type: String },
  customerName: { type: String },
  product: { type: String },
  quantity: { type: Number, default: 0 },
  ton: { type: Number, default: 0 },
  ratePerTon: { type: Number, default: 0 },
  fromLocation: { type: String },
  toLocation: { type: String },
  mobileNumber: { type: String },
  status: { type: String, enum: ['Running', 'Completed', 'Cancelled'], default: 'Running' },
  remarks: { type: String, default: '' },
  
  freightCharges: { type: Number, default: 0 },
  totalIncome: { type: Number, default: 0 },
  
  totalExpense: { type: Number, default: 0 },
  expenses: { type: [tripExpenseSchema], default: [] },
  
  netProfit: { type: Number, default: 0 },
  
  advanceReceived: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' },
  paymentMode: { type: String, enum: ['Cash', 'Bank', 'UPI', 'Pending'], default: 'Pending' },
  paymentDate: { type: String },
  pendingAmount: { type: Number, default: 0 },
  
  evidence: { type: String },
  evidenceName: { type: String }
});

module.exports = mongoose.model('Trip', tripSchema);
