const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  vehicleId: { type: String, required: true },
  date: { type: String, required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMode: { type: String, enum: ['Cash', 'Bank', 'UPI', 'Pending'], required: true },
  description: { type: String, default: '' },
  evidence: { type: String },
  evidenceName: { type: String },
  wasPending: { type: Boolean, default: false },
  tripId: { type: String }
});

module.exports = mongoose.model('Transaction', transactionSchema);
