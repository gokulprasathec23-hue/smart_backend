require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');
const Machine = require('./models/Machine');
const MachineLog = require('./models/MachineLog');

const app = express();
const server = http.createServer(app);

const frontendOrigin = process.env.FRONTEND_URL || '*';

const io = new Server(server, {
    cors: { origin: frontendOrigin }
});

// Middleware
app.use(cors({
    origin: frontendOrigin
}));
app.use(express.json());

// Inject io into requests
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.get('/', (req, res) => {
    res.json({ message: "Smart IoT Control Panel API is running..." });
});

app.use('/api', apiRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Receive data from IoT Simulator
    socket.on('iot_data_update', async (data) => {
        try {
            let machine = await Machine.findOne({ machineId: data.machineId });

            if (!machine) {
                // Register new machine implicitly from simulator
                machine = await Machine.create({
                    machineId: data.machineId,
                    machineName: `Machine-${data.machineId.split('-')[1] || data.machineId}`,
                    status: 'Running',
                    startedAt: Date.now()
                });
            }

            // Fix missing startedAt on simulator startup
            if (machine.status === 'Running' && !machine.startedAt) {
                machine.startedAt = Date.now();
            }

            // Update machine stats based on IoT simulator payload if running
            if (machine.status === 'Running' || machine.status === 'Error') {
                machine.temperature = data.temperature;
                machine.rpm = data.rpm;
                machine.voltage = data.voltage;
                machine.current = data.current;
                machine.powerConsumption = data.voltage * data.current;
                // Predictive maintenance basic check
                if (machine.temperature > 85) machine.health = 'Warning';
                if (machine.temperature > 100) {
                    machine.health = 'Critical';
                    machine.status = 'Error';
                    io.emit('alert', { type: 'critical', message: `High Temp Alert: ${machine.machineName}` });
                } else if (machine.temperature < 85 && machine.status !== 'Error') {
                    machine.health = 'Good';
                }
                machine.lastUpdated = Date.now();
                await machine.save();

                // Log data for charts occasionally to save space, eg: only 1 in 3, but let's do every one for demo
                await MachineLog.create({
                    machineId: machine._id,
                    temperature: machine.temperature,
                    rpm: machine.rpm,
                    voltage: machine.voltage,
                    current: machine.current,
                    powerConsumption: machine.powerConsumption,
                    status: machine.status,
                    health: machine.health
                });

                // Broadcast update to all frontend clients
                io.emit('machine_update', machine);
            }
        } catch (error) {
            console.error('Socket Error:', error.message);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5174;

// Connect DB
connectDB();

// Only listen locally, Vercel serverless functions will use the exported app directly
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
