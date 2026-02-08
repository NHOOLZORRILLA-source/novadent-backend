const express = require('express');
const router = express.Router();

// GET /api/patients - Listar pacientes
router.get('/', (req, res) => {
  // Datos de prueba
  const patients = [
    {
      id: 1,
      first_name: 'Ana',
      last_name: 'García',
      phone: '555-1111',
      email: 'ana@ejemplo.com',
      lead_status: 'Nuevo'
    },
    {
      id: 2,
      first_name: 'Luis',
      last_name: 'Martínez',
      phone: '555-2222',
      email: 'luis@ejemplo.com',
      lead_status: 'Contactado'
    }
  ];
  
  res.json({
    success: true,
    count: patients.length,
    data: patients
  });
});

// POST /api/patients - Crear paciente
router.post('/', (req, res) => {
  const { first_name, last_name, phone, email } = req.body;
  
  if (!first_name || !last_name || !phone) {
    return res.status(400).json({
      error: true,
      message: 'Nombre, apellido y teléfono son requeridos'
    });
  }
  
  const newPatient = {
    id: Date.now(),
    first_name,
    last_name,
    phone,
    email: email || '',
    lead_status: 'Nuevo',
    created_at: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: 'Paciente creado exitosamente',
    data: newPatient
  });
});

module.exports = router;