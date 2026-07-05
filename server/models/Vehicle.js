const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  id: { type: String, required: true, unique: true },
  vehicleNumber: { type: String, required: true },
  driverName: { type: String },
  driverPhone: { type: String },
  ownerName: { type: String },
  type: { type: String },
  status: { type: String, enum: ['Active', 'Maintenance'], default: 'Active' },
  addedAt: { type: String }
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
