import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import Vehicle from './models/Vehicle.js';
import Trip from './models/Trip.js';
import Transaction from './models/Transaction.js';
import User from './models/User.js';
import auth from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/transport';
const JWT_SECRET = process.env.JWT_SECRET || 'transport-app-super-secret-key-9988';

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
// AUTH ROUTES
// =======================
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Please enter all fields' });
    }

    // Check if user exists
    let user = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (user) {
      return res.status(400).json({ error: 'User already exists with this email or username' });
    }

    // Create new user
    user = new User({ username, email: email.toLowerCase(), password });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    // Data migration: associate any existing unowned records with the first user who registers
    await Vehicle.updateMany({ userId: { $exists: false } }, { $set: { userId: user._id } });
    await Trip.updateMany({ userId: { $exists: false } }, { $set: { userId: user._id } });
    await Transaction.updateMany({ userId: { $exists: false } }, { $set: { userId: user._id } });

    // Create JWT
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter all fields' });
    }

    // Check for user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Create JWT
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// VEHICLE ROUTES
// =======================
app.get('/api/vehicles', auth, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ userId: req.user.id });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/vehicles', auth, async (req, res) => {
  try {
    const newVehicle = new Vehicle({
      ...req.body,
      userId: req.user.id
    });
    const savedVehicle = await newVehicle.save();
    res.json(savedVehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/vehicles/:id', auth, async (req, res) => {
  try {
    const updatedVehicle = await Vehicle.findOneAndUpdate(
      { id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    res.json(updatedVehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/vehicles/:id', auth, async (req, res) => {
  try {
    await Vehicle.findOneAndDelete({ id: req.params.id, userId: req.user.id });
    res.json({ message: 'Vehicle deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// TRIP ROUTES
// =======================
app.get('/api/trips', auth, async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.user.id });
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/trips', auth, async (req, res) => {
  try {
    const newTrip = new Trip({
      ...req.body,
      userId: req.user.id
    });
    const savedTrip = await newTrip.save();
    res.json(savedTrip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/trips/:id', auth, async (req, res) => {
  try {
    const updatedTrip = await Trip.findOneAndUpdate(
      { id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    res.json(updatedTrip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/trips/:id', auth, async (req, res) => {
  try {
    await Trip.findOneAndDelete({ id: req.params.id, userId: req.user.id });
    res.json({ message: 'Trip deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// TRANSACTION ROUTES
// =======================
app.get('/api/transactions', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transactions', auth, async (req, res) => {
  try {
    const paymentStatus = req.body.paymentMode === 'Pending' ? 'Pending' : 'Paid';
    const newTransaction = new Transaction({
      ...req.body,
      userId: req.user.id,
      paymentStatus
    });
    const savedTransaction = await newTransaction.save();
    res.json(savedTransaction);
  } catch (error) {
    console.error('Transaction Save Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transactions/:id/payments', auth, async (req, res) => {
  try {
    const tx = await Transaction.findOne({ id: req.params.id, userId: req.user.id });
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

app.put('/api/transactions/:id', auth, async (req, res) => {
  try {
    const updatedTransaction = await Transaction.findOneAndUpdate(
      { id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    res.json(updatedTransaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/transactions/:id', auth, async (req, res) => {
  try {
    await Transaction.findOneAndDelete({ id: req.params.id, userId: req.user.id });
    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// BULK SYNC ROUTES
// =======================
app.post('/api/sync', auth, async (req, res) => {
  try {
    const { vehicles, trips, transactions } = req.body;
    
    if (vehicles && vehicles.length > 0) {
      await Vehicle.deleteMany({ userId: req.user.id });
      const vehiclesWithUser = vehicles.map(v => ({ ...v, userId: req.user.id }));
      await Vehicle.insertMany(vehiclesWithUser);
    }
    
    if (trips && trips.length > 0) {
      await Trip.deleteMany({ userId: req.user.id });
      const tripsWithUser = trips.map(t => ({ ...t, userId: req.user.id }));
      await Trip.insertMany(tripsWithUser);
    }
    
    if (transactions && transactions.length > 0) {
      await Transaction.deleteMany({ userId: req.user.id });
      const transactionsWithUser = transactions.map(t => ({ ...t, userId: req.user.id }));
      await Transaction.insertMany(transactionsWithUser);
    }
    
    res.json({ message: 'Data synced successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/clear', auth, async (req, res) => {
  try {
    await Vehicle.deleteMany({ userId: req.user.id });
    await Trip.deleteMany({ userId: req.user.id });
    await Transaction.deleteMany({ userId: req.user.id });
    res.json({ message: 'All database records cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../dist')));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

export default app;

const isMain = process.argv[1] && (
  path.resolve(process.argv[1]) === path.resolve(__filename) || 
  path.resolve(process.argv[1]) === path.resolve(path.join(__dirname, 'index.js'))
);

if (isMain) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
