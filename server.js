require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(express.json());

// Health check / root route
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Smart IoT Control Panel API is running...' });
});

// API Routes
app.use('/api', apiRoutes);

// Connect to DB (runs once per cold start on Vercel)
let dbConnected = false;
const ensureDB = async () => {
    if (!dbConnected) {
        await connectDB();
        dbConnected = true;
    }
};
ensureDB();

// Only run server.listen when NOT on Vercel (local dev)
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 5174;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
