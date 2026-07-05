require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Vehicle = require('./models/Vehicle');
const Trip = require('./models/Trip');
const Transaction = require('./models/Transaction');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/transport';

// Middleware
// Increase limit for base64 images (evidence)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

// Connect to MongoDB
mongoose.connect(MONGO_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// =======================
// VEHICLE ROUTES
// =======================
app.get('/api/vehicles', async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/vehicles', async (req, res) => {
  try {
    const newVehicle = new Vehicle(req.body);
    const savedVehicle = await newVehicle.save();
    res.json(savedVehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/vehicles/:id', async (req, res) => {
  try {
    const updatedVehicle = await Vehicle.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(updatedVehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    await Vehicle.findOneAndDelete({ id: req.params.id });
    res.json({ message: 'Vehicle deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// TRIP ROUTES
// =======================
app.get('/api/trips', async (req, res) => {
  try {
    const trips = await Trip.find();
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/trips', async (req, res) => {
  try {
    const newTrip = new Trip(req.body);
    const savedTrip = await newTrip.save();
    res.json(savedTrip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/trips/:id', async (req, res) => {
  try {
    const updatedTrip = await Trip.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(updatedTrip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/trips/:id', async (req, res) => {
  try {
    await Trip.findOneAndDelete({ id: req.params.id });
    res.json({ message: 'Trip deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// TRANSACTION ROUTES
// =======================
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find();
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const paymentStatus = req.body.paymentMode === 'Pending' ? 'Pending' : 'Paid';
    const newTransaction = new Transaction({
      ...req.body,
      paymentStatus
    });
    const savedTransaction = await newTransaction.save();
    res.json(savedTransaction);
  } catch (error) {
    console.error('Transaction Save Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transactions/:id/payments', async (req, res) => {
  try {
    const tx = await Transaction.findOne({ id: req.params.id });
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const { date, amount, paymentMode, description } = req.body;
    const paymentAmount = Number(amount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    // Add payment to array
    const paymentId = Math.random().toString(36).substring(2, 9);
    tx.payments.push({
      id: paymentId,
      date,
      amount: paymentAmount,
      paymentMode,
      description: description || ''
    });

    // Recalculate status and balance
    const totalPaid = tx.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = tx.amount - totalPaid;

    if (balance <= 0) {
      tx.paymentStatus = 'Paid';
      tx.paymentMode = paymentMode; // Set overall payment mode to final clearing mode
    } else {
      tx.paymentStatus = 'Partial';
      tx.paymentMode = 'Pending';
    }

    const savedTx = await tx.save();
    res.json(savedTx);
  } catch (error) {
    console.error('Payment Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/transactions/:id', async (req, res) => {
  try {
    const updatedTransaction = await Transaction.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(updatedTransaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    await Transaction.findOneAndDelete({ id: req.params.id });
    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// BULK SYNC ROUTES
// =======================
app.post('/api/sync', async (req, res) => {
  try {
    const { vehicles, trips, transactions } = req.body;
    
    // Using bulkWrite or simple loop
    if (vehicles && vehicles.length > 0) {
      await Vehicle.deleteMany({});
      await Vehicle.insertMany(vehicles);
    }
    
    if (trips && trips.length > 0) {
      await Trip.deleteMany({});
      await Trip.insertMany(trips);
    }
    
    if (transactions && transactions.length > 0) {
      await Transaction.deleteMany({});
      await Transaction.insertMany(transactions);
    }
    
    res.json({ message: 'Data synced successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/clear', async (req, res) => {
  try {
    await Vehicle.deleteMany({});
    await Trip.deleteMany({});
    await Transaction.deleteMany({});
    res.json({ message: 'All database records cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const path = require('path');
// Serve static frontend files
app.use(express.static(path.join(__dirname, '../dist')));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
