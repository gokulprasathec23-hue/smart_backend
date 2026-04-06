const express = require('express');
const router = express.Router();
const { loginUser } = require('../controllers/authController');
const {
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
} = require('../controllers/machineController');
const { protect, admin } = require('../middleware/authMiddleware');

// Auth routes
router.post('/login', loginUser);

// Machine routes (Protected)
router.route('/machines')
    .get(protect, getMachines)
    .post(protect, admin, createMachine);

router.route('/machines/:id')
    .put(protect, admin, updateMachine)
    .delete(protect, admin, deleteMachine);

router.get('/machine/status/:id', protect, getMachineStatus);
router.get('/machine/logs/:id', protect, getMachineLogs);

// Machine Control routes (Protected, Admin Only)
router.post('/machine/start', protect, admin, startMachine);
router.post('/machine/stop', protect, admin, stopMachine);
router.post('/machine/restart', protect, admin, restartMachine);
router.post('/machine/emergency-stop', protect, admin, emergencyStop);

module.exports = router;
