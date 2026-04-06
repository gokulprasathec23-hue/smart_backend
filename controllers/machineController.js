const Machine = require('../models/Machine');
const MachineLog = require('../models/MachineLog');

// Get all machines
const getMachines = async (req, res) => {
    try {
        const machines = await Machine.find({});
        res.json(machines);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Start machine
const startMachine = async (req, res) => {
    try {
        const machine = await Machine.findOne({ machineId: req.body.machineId });
        if (machine) {
            machine.status = 'Running';
            machine.startedAt = Date.now();
            machine.lastUpdated = Date.now();
            await machine.save();
            
            // Emit via socket io attached to req
            req.io.emit('machine_command', { machineId: machine.machineId, command: 'start' });
            req.io.emit('machine_update', machine);

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
        const machine = await Machine.findOne({ machineId: req.body.machineId });
        if (machine) {
            machine.status = 'Stopped';
            machine.startedAt = null;
            machine.rpm = 0;
            machine.current = 0;
            machine.powerConsumption = 0;
            machine.lastUpdated = Date.now();
            await machine.save();
            
            req.io.emit('machine_command', { machineId: machine.machineId, command: 'stop' });
            req.io.emit('machine_update', machine);

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
        const machine = await Machine.findOne({ machineId: req.body.machineId });
        if (machine) {
            machine.status = 'Stopped';
            await machine.save();
            req.io.emit('machine_command', { machineId: machine.machineId, command: 'restart' });
            req.io.emit('machine_update', machine);
            
            // Simulate restart delay
            setTimeout(async () => {
                const updatedMachine = await Machine.findOne({ machineId: req.body.machineId });
                if(updatedMachine) {
                   updatedMachine.status = 'Running';
                   updatedMachine.startedAt = Date.now();
                   await updatedMachine.save();
                   req.io.emit('machine_update', updatedMachine);
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
            
            req.io.emit('machine_command', { machineId: machine.machineId, command: 'emergency_stop' });
            req.io.emit('machine_update', machine);
            
            // Generate alert
            req.io.emit('alert', { type: 'critical', message: `EMERGENCY STOP activated for ${machine.machineName}`});

            res.json(machine);
        } else {
            res.status(404).json({ message: 'Machine not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Get single machine status
const getMachineStatus = async (req, res) => {
    try {
        const machine = await Machine.findOne({ machineId: req.params.id });
        if (machine) {
            res.json(machine);
        } else {
            res.status(404).json({ message: 'Machine not found' });
        }
    } catch (error) {
         res.status(500).json({ message: error.message });
    }
}

// Get historical log data for charts
const getMachineLogs = async (req, res) => {
    try {
         const machine = await Machine.findOne({ machineId: req.params.id });
         if (!machine) return res.status(404).json({ message: 'Machine not found' });

         // Get last 20 logs
         const logs = await MachineLog.find({ machineId: machine._id })
                                      .sort({ recordedAt: -1 })
                                      .limit(20);
         res.json(logs.reverse());
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Create machine
const createMachine = async (req, res) => {
    try {
        const { machineId, machineName, ...otherData } = req.body;
        
        // Check if machineId already exists
        const existingMachine = await Machine.findOne({ machineId });
        if (existingMachine) {
            return res.status(400).json({ message: 'Machine with this ID already exists' });
        }

        const machine = new Machine({
            machineId,
            machineName,
            ...otherData
        });

        const createdMachine = await machine.save();
        
        // Notify clients
        req.io.emit('machine_update', createdMachine);
        
        res.status(201).json(createdMachine);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update machine
const updateMachine = async (req, res) => {
    try {
        const machine = await Machine.findOne({ machineId: req.params.id });
        
        if (machine) {
            // Update fields provided in request body
            const { machineName, status, health } = req.body;
            
            if (machineName) machine.machineName = machineName;
            
            // Only update status and health if provided (usually for administrative override)
            if (status) machine.status = status;
            if (health) machine.health = health;
            
            machine.lastUpdated = Date.now();
            
            const updatedMachine = await machine.save();
            
            // Notify clients
            req.io.emit('machine_update', updatedMachine);
            
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
        const machine = await Machine.findOne({ machineId: req.params.id });
        
        if (machine) {
            // Alternatively, could use machine.remove() if using older mongoose version,
            // but deleteOne is safer
            await Machine.deleteOne({ machineId: req.params.id });
            
            // Also delete associated logs
            await MachineLog.deleteMany({ machineId: machine._id });
            
            // Notify clients
            req.io.emit('machine_deleted', { machineId: req.params.id });
            
            res.json({ message: 'Machine removed' });
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
