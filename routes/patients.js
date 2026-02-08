const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { auth } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(auth);

router.get('/', patientController.getPatients);
router.get('/stats', patientController.getPatientStats);
router.get('/:id', patientController.getPatientById);
router.post('/', patientController.createPatient);
router.put('/:id', patientController.updatePatient);
router.delete('/:id', patientController.deletePatient);

module.exports = router;