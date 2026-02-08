const express = require('express');
const router = express.Router();

// GET /api/appointments - Listar citas
router.get('/', (req, res) => {
  const appointments = [
    {
      id: 1,
      patient_id: 1,
      patient_name: 'Ana García',
      date: '2026-02-10',
      time: '10:00',
      type: 'Limpieza',
      status: 'Programada'
    },
    {
      id: 2,
      patient_id: 2,
      patient_name: 'Luis Martínez',
      date: '2026-02-11',
      time: '14:30',
      type: 'Consulta',
      status: 'Confirmada'
    }
  ];
  
  res.json({
    success: true,
    count: appointments.length,
    data: appointments
  });
});

// POST /api/appointments - Crear cita
router.post('/', (req, res) => {
  const { patient_id, date, time, type } = req.body;
  
  if (!patient_id || !date || !time || !type) {
    return res.status(400).json({
      error: true,
      message: 'Todos los campos son requeridos'
    });
  }
  
  const newAppointment = {
    id: Date.now(),
    patient_id,
    date,
    time,
    type,
    status: 'Programada',
    created_at: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: 'Cita creada exitosamente',
    data: newAppointment
  });
});

module.exports = router;