const mongoose = require('mongoose');

const machineSchema = new mongoose.Schema({
    machineId: {
        type: String,
        required: true,
        unique: true
    },
    machineName: {
        type: String,
        required: true
    },
    temperature: {
        type: Number,
        default: 0
    },
    rpm: {
        type: Number,
        default: 0
    },
    voltage: {
        type: Number,
        default: 0
    },
    current: {
        type: Number,
        default: 0
    },
    powerConsumption: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Running', 'Stopped', 'Error', 'Offline'],
        default: 'Stopped'
    },
    health: {
        type: String,
        enum: ['Good', 'Warning', 'Critical'],
        default: 'Good'
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    startedAt: {
        type: Date,
        default: null
    }
});

const Machine = mongoose.model('Machine', machineSchema);
module.exports = Machine;
