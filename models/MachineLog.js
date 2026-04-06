const mongoose = require('mongoose');

const machineLogSchema = new mongoose.Schema({
    machineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Machine',
        required: true
    },
    temperature: Number,
    rpm: Number,
    voltage: Number,
    current: Number,
    powerConsumption: Number,
    status: String,
    health: String,
    recordedAt: {
        type: Date,
        default: Date.now
    }
});

const MachineLog = mongoose.model('MachineLog', machineLogSchema);
module.exports = MachineLog;
