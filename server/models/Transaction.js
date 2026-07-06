import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  date: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMode: { type: String, enum: ['Cash', 'Bank', 'UPI', 'Check', 'Online'], required: true },
  description: { type: String, default: '' }
}, { timestamps: true });

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  id: { type: String, required: true },
  vehicleId: { type: String, required: true },
  date: { type: String, required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMode: { type: String, enum: ['Cash', 'Bank', 'UPI', 'Pending', 'Check', 'Online'], required: true },
  description: { type: String, default: '' },
  evidence: { type: String },
  evidenceName: { type: String },
  wasPending: { type: Boolean, default: false },
  tripId: { type: String },
  from: { type: String },
  to: { type: String },
  weight: { type: Number },
  rate: { type: Number },
  material: { type: String },
  partyName: { type: String },
  paymentStatus: { type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Paid' },
  payments: { type: [paymentSchema], default: [] }
}, { timestamps: true });

transactionSchema.index({ userId: 1, id: 1 }, { unique: true });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
