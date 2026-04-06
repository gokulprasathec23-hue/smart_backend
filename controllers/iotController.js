const Machine = require('../models/Machine');
const MachineLog = require('../models/MachineLog');
const connectDB = require('../config/db');

// Called by IoT Simulator via POST /api/iot/update
const iotUpdate = async (req, res) => {
    // Optional: protect with a shared secret
    const iotSecret = req.headers['x-iot-secret'];
    if (process.env.IOT_SECRET && iotSecret !== process.env.IOT_SECRET) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    await connectDB();

    const data = req.body;

    if (!data || !data.machineId) {
        return res.status(400).json({ message: 'machineId is required' });
    }

    try {
        let machine = await Machine.findOne({ machineId: data.machineId });

        if (!machine) {
            machine = await Machine.create({
                machineId: data.machineId,
                machineName: `Machine-${data.machineId.split('-')[1] || data.machineId}`,
                status: 'Running',
                startedAt: Date.now()
            });
        }

        // Fix missing startedAt
        if (machine.status === 'Running' && !machine.startedAt) {
            machine.startedAt = Date.now();
        }

        // Only update stats if machine is Running or Error
        if (machine.status === 'Running' || machine.status === 'Error') {
            machine.temperature = data.temperature;
            machine.rpm = data.rpm;
            machine.voltage = data.voltage;
            machine.current = data.current;
            machine.powerConsumption = data.voltage * data.current;

            // Predictive maintenance logic
            if (machine.temperature > 100) {
                machine.health = 'Critical';
                machine.status = 'Error';
            } else if (machine.temperature > 85) {
                machine.health = 'Warning';
            } else if (machine.status !== 'Error') {
                machine.health = 'Good';
            }

            machine.lastUpdated = Date.now();
            await machine.save();

            // Save log for chart history
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
        }

        res.json({ success: true, machine });
    } catch (error) {
        console.error('IoT Update Error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { iotUpdate };
