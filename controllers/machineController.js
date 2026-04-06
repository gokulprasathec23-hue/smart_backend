const Machine = require('../models/Machine');
const MachineLog = require('../models/MachineLog');
const connectDB = require('../config/db');

const ensureDB = async () => connectDB();

// Get all machines
const getMachines = async (req, res) => {
    try {
        await ensureDB();
        const machines = await Machine.find({});
        res.json(machines);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Start machine
const startMachine = async (req, res) => {
    try {
        await ensureDB();
        const machine = await Machine.findOne({ machineId: req.body.machineId });
        if (machine) {
            machine.status = 'Running';
            machine.startedAt = Date.now();
            machine.lastUpdated = Date.now();
            await machine.save();
            res.json(machine);
        } else {
            res.status(404).json({ message: 'Machine not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Stop machine
const stopMachine = async (req, res) => {
    try {
        await ensureDB();
        const machine = await Machine.findOne({ machineId: req.body.machineId });
        if (machine) {
            machine.status = 'Stopped';
            machine.startedAt = null;
            machine.rpm = 0;
            machine.current = 0;
            machine.powerConsumption = 0;
            machine.lastUpdated = Date.now();
            await machine.save();
            res.json(machine);
        } else {
            res.status(404).json({ message: 'Machine not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Restart machine
const restartMachine = async (req, res) => {
    try {
        await ensureDB();
        const machine = await Machine.findOne({ machineId: req.body.machineId });
        if (machine) {
            machine.status = 'Stopped';
            machine.startedAt = null;
            await machine.save();

            // Simulate restart delay (note: setTimeout works in Vercel but may be cut short)
            setTimeout(async () => {
                try {
                    const updatedMachine = await Machine.findOne({ machineId: req.body.machineId });
                    if (updatedMachine && updatedMachine.status === 'Stopped') {
                        updatedMachine.status = 'Running';
                        updatedMachine.startedAt = Date.now();
                        updatedMachine.lastUpdated = Date.now();
                        await updatedMachine.save();
                    }
                } catch (e) {
                    console.error('Restart timeout error:', e.message);
                }
            }, 3000);

            res.json({ message: 'Restart initiated', machine });
        } else {
            res.status(404).json({ message: 'Machine not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Emergency stop
const emergencyStop = async (req, res) => {
    try {
        await ensureDB();
        const machine = await Machine.findOne({ machineId: req.body.machineId });
        if (machine) {
            machine.status = 'Error';
            machine.startedAt = null;
            machine.health = 'Critical';
            machine.rpm = 0;
            machine.current = 0;
            machine.powerConsumption = 0;
            machine.lastUpdated = Date.now();
            await machine.save();
            res.json(machine);
        } else {
            res.status(404).json({ message: 'Machine not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single machine status
const getMachineStatus = async (req, res) => {
    try {
        await ensureDB();
        const machine = await Machine.findOne({ machineId: req.params.id });
        if (machine) {
            res.json(machine);
        } else {
            res.status(404).json({ message: 'Machine not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get historical log data for charts
const getMachineLogs = async (req, res) => {
    try {
        await ensureDB();
        const machine = await Machine.findOne({ machineId: req.params.id });
        if (!machine) return res.status(404).json({ message: 'Machine not found' });

        const logs = await MachineLog.find({ machineId: machine._id })
            .sort({ recordedAt: -1 })
            .limit(20);
        res.json(logs.reverse());
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create machine
const createMachine = async (req, res) => {
    try {
        await ensureDB();
        const { machineId, machineName, ...otherData } = req.body;

        const existingMachine = await Machine.findOne({ machineId });
        if (existingMachine) {
            return res.status(400).json({ message: 'Machine with this ID already exists' });
        }

        const machine = new Machine({ machineId, machineName, ...otherData });
        const createdMachine = await machine.save();
        res.status(201).json(createdMachine);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update machine
const updateMachine = async (req, res) => {
    try {
        await ensureDB();
        const machine = await Machine.findOne({ machineId: req.params.id });

        if (machine) {
            const { machineName, status, health } = req.body;
            if (machineName) machine.machineName = machineName;
            if (status) machine.status = status;
            if (health) machine.health = health;
            machine.lastUpdated = Date.now();

            const updatedMachine = await machine.save();
            res.json(updatedMachine);
        } else {
            res.status(404).json({ message: 'Machine not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete machine
const deleteMachine = async (req, res) => {
    try {
        await ensureDB();
        const machine = await Machine.findOne({ machineId: req.params.id });

        if (machine) {
            await Machine.deleteOne({ machineId: req.params.id });
            await MachineLog.deleteMany({ machineId: machine._id });
            res.json({ message: 'Machine removed', machineId: req.params.id });
        } else {
            res.status(404).json({ message: 'Machine not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getMachines,
    createMachine,
    updateMachine,
    deleteMachine,
    startMachine,
    stopMachine,
    restartMachine,
    emergencyStop,
    getMachineStatus,
    getMachineLogs
};
