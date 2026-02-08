require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== CONFIGURACIÓN BÁSICA ==========
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ========== CORS ==========
const corsOptions = {
  origin: [
    'https://nova.bellux.in',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://novadent-backend-production.up.railway.app',
    'https://web.postman.co'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

app.use(cors(corsOptions));

// ========== MIDDLEWARE DE LOGS ==========
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ========== RUTAS PÚBLICAS ==========

// 1. Ruta principal
app.get('/', (req, res) => {
  res.json({ 
    message: '🦷 NovaDent CRM Backend',
    status: 'Funcionando correctamente',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /health',
      test: 'GET /api/test',
      login: 'POST /api/auth/login',
      register: 'POST /api/auth/register',
      patients: 'GET /api/patients',
      create_patient: 'POST /api/patients'
    }
  });
});

// 2. Health Check (CRÍTICO)
app.get('/health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  res.status(200).json({ 
    status: 'ok', 
    message: '✅ NovaDent API funcionando',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()) + ' segundos',
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100
    },
    node_version: process.version,
    platform: process.platform,
    database: 'simulated' // Cambiar a 'connected' cuando MySQL funcione
  });
});

// 3. Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'API de prueba funcionando',
    data: { 
      test: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// ========== RUTAS DE AUTENTICACIÓN (SIMULADAS) ==========

// Login (POST)
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login attempt:', req.body);
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email y contraseña son requeridos'
    });
  }
  
  // Respuesta simulada
  res.json({
    success: true,
    message: 'Login exitoso (modo simulación)',
    token: 'mock-jwt-token-' + Date.now(),
    user: {
      id: 1,
      email: email,
      name: 'Usuario Demo',
      role: 'admin'
    }
  });
});

// Registro (POST)
app.post('/api/auth/register', (req, res) => {
  console.log('📝 Register attempt:', req.body);
  
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Nombre, email y contraseña son requeridos'
    });
  }
  
  // Respuesta simulada
  res.json({
    success: true,
    message: 'Usuario registrado (modo simulación)',
    token: 'mock-jwt-register-' + Date.now(),
    user: {
      id: Date.now(),
      name: name,
      email: email,
      role: 'user'
    }
  });
});

// ========== RUTAS DE PACIENTES (SIMULADAS) ==========

// Listar pacientes (GET)
app.get('/api/patients', (req, res) => {
  console.log('📋 Listando pacientes...');
  
  const mockPatients = [
    {
      id: 1,
      first_name: 'Ana',
      last_name: 'García',
      phone: '555-1111',
      email: 'ana@ejemplo.com',
      lead_status: 'Nuevo',
      created_at: '2026-02-01T10:00:00Z'
    },
    {
      id: 2,
      first_name: 'Luis',
      last_name: 'Martínez',
      phone: '555-2222',
      email: 'luis@ejemplo.com',
      lead_status: 'Contactado',
      created_at: '2026-02-02T14:30:00Z'
    },
    {
      id: 3,
      first_name: 'Carlos',
      last_name: 'Rodríguez',
      phone: '555-3333',
      email: 'carlos@ejemplo.com',
      lead_status: 'Agendado',
      created_at: '2026-02-03T09:15:00Z'
    }
  ];
  
  res.json({
    success: true,
    count: mockPatients.length,
    data: mockPatients,
    message: 'Usando datos simulados'
  });
});

// Crear paciente (POST)
app.post('/api/patients', (req, res) => {
  console.log('➕ Creando paciente:', req.body);
  
  const { first_name, last_name, phone, email } = req.body;
  
  if (!first_name || !last_name || !phone) {
    return res.status(400).json({
      success: false,
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: 'Paciente creado exitosamente',
    data: newPatient
  });
});

// ========== RUTAS DE CITAS (SIMULADAS) ==========

app.get('/api/appointments', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        patient_name: 'Ana García',
        date: '2026-02-10',
        time: '10:00',
        type: 'Limpieza'
      }
    ]
  });
});

app.post('/api/appointments', (req, res) => {
  res.json({
    success: true,
    message: 'Cita creada (simulación)',
    data: req.body
  });
});

// ========== MANEJO DE ERRORES ==========

// Ruta no encontrada
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.url,
    method: req.method,
    available_routes: [
      'GET /',
      'GET /health',
      'GET /api/test',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/patients',
      'POST /api/patients',
      'GET /api/appointments',
      'POST /api/appointments'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('🔥 ERROR:', err.stack);
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Contacta al administrador'
  });
});

// ========== INICIAR SERVIDOR ==========
const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 NOVADENT CRM BACKEND INICIADO');
  console.log('='.repeat(60));
  console.log(`✅ Servidor: http://localhost:${PORT}`);
  console.log(`✅ Railway: https://novadent-backend-production.up.railway.app`);
  console.log(`✅ Health: /health`);
  console.log(`✅ Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Memoria: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
  console.log('='.repeat(60));
  console.log('📋 Endpoints disponibles:');
  console.log('  GET  /                    - Ruta principal');
  console.log('  GET  /health              - Health check');
  console.log('  GET  /api/test            - Test API');
  console.log('  POST /api/auth/login      - Login (email, password)');
  console.log('  POST /api/auth/register   - Registro (name, email, password)');
  console.log('  GET  /api/patients        - Listar pacientes');
  console.log('  POST /api/patients        - Crear paciente');
  console.log('='.repeat(60) + '\n');
});

module.exports = { app, server };