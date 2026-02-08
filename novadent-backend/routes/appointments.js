const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { auth } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(auth);

router.get('/', appointmentController.getAppointments);
router.get('/stats', appointmentController.getAppointmentStats);
router.get('/:id', appointmentController.getAppointmentById);
router.post('/', appointmentController.createAppointment);
router.put('/:id', appointmentController.updateAppointment);
router.delete('/:id', appointmentController.deleteAppointment);

module.exports = router;