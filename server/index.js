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
    const newTransaction = new Transaction(req.body);
    const savedTransaction = await newTransaction.save();
    res.json(savedTransaction);
  } catch (error) {
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
