require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== CONFIGURACIÓN JWT ==========
const JWT_SECRET = process.env.JWT_SECRET || 'novadent-secret-key-' + Date.now();

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
    'https://web.postman.co',
    'https://uptimerobot.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// ========== MIDDLEWARE DE LOGS ==========
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ========== MIDDLEWARE DE AUTENTICACIÓN ==========
const authenticateToken = (req, res, next) => {
  // Rutas públicas (no requieren autenticación)
  const publicRoutes = [
    '/',
    '/health',
    '/api/test',
    '/api/auth/login',
    '/api/auth/register'
  ];
  
  // Si es ruta pública, continuar sin token
  if (publicRoutes.includes(req.path)) {
    return next();
  }
  
  // Obtener token del header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Acceso denegado. Token no proporcionado.'
    });
  }
  
  try {
    // Verificar token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Agregar usuario a la request
    next();
  } catch (error) {
    console.error('❌ Error verificando token:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado. Por favor, inicia sesión nuevamente.'
      });
    }
    
    return res.status(403).json({
      success: false,
      message: 'Token inválido.'
    });
  }
};

// Aplicar middleware de autenticación a todas las rutas
app.use(authenticateToken);

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
      public: {
        health: 'GET /health',
        test: 'GET /api/test',
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register'
      },
      protected: {
        patients: 'GET /api/patients (Requiere token)',
        create_patient: 'POST /api/patients (Requiere token)',
        appointments: 'GET /api/appointments (Requiere token)'
      }
    },
    auth_required: 'Para rutas protegidas, incluir header: Authorization: Bearer <token>'
  });
});

// 2. Health Check (CRÍTICO para UptimeRobot)
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
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100
    },
    node_version: process.version,
    platform: process.platform,
    database: 'simulated', // Cambiar a 'connected' cuando MySQL funcione
    jwt_enabled: true,
    environment: process.env.NODE_ENV || 'development'
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
      environment: process.env.NODE_ENV || 'development',
      jwt_available: true
    }
  });
});

// ========== RUTAS DE AUTENTICACIÓN ==========

// POST /api/auth/login - Login con JWT real
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', { 
      email: req.body.email, 
      password: req.body.password ? '***' : 'empty' 
    });
    
    const { email, password } = req.body;
    
    // Validación básica
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }
    
    // TODO: En producción, buscar usuario en MySQL
    // Por ahora, usuario simulado
    const mockUser = {
      id: 1,
      email: email.toLowerCase(),
      name: 'Usuario Demo',
      role: 'admin'
    };
    
    // TODO: En producción, verificar contraseña con bcrypt
    // const isValid = await bcrypt.compare(password, user.password_hash);
    // if (!isValid) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Credenciales incorrectas'
    //   });
    // }
    
    // Generar token JWT real (válido por 24 horas)
    const token = jwt.sign(
      {
        userId: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Respuesta exitosa
    res.json({
      success: true,
      message: 'Login exitoso',
      token: token,
      user: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      },
      expires_in: '24 horas'
    });
    
  } catch (error) {
    console.error('🔥 Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor durante el login'
    });
  }
});

// POST /api/auth/register - Registro con JWT real
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('📝 Register attempt:', { 
      name: req.body.name, 
      email: req.body.email,
      password: req.body.password ? '***' : 'empty' 
    });
    
    const { name, email, password } = req.body;
    
    // Validación
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, email y contraseña son requeridos'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }
    
    // TODO: En producción, verificar si email ya existe en MySQL
    // TODO: En producción, hashear contraseña con bcrypt
    // const passwordHash = await bcrypt.hash(password, 10);
    
    // Usuario simulado
    const newUserId = Date.now();
    const mockUser = {
      id: newUserId,
      name: name.trim(),
      email: email.toLowerCase(),
      role: 'user'
    };
    
    // Generar token JWT real
    const token = jwt.sign(
      {
        userId: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      message: 'Usuario registrado exitosamente',
      token: token,
      user: {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role
      },
      expires_in: '24 horas'
    });
    
  } catch (error) {
    console.error('🔥 Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor durante el registro'
    });
  }
});

// GET /api/auth/me - Obtener información del usuario actual
app.get('/api/auth/me', (req, res) => {
  // Esta ruta requiere autenticación (middleware ya verifica)
  res.json({
    success: true,
    message: 'Información del usuario',
    user: req.user // Información del token decodificado
  });
});

// ========== RUTAS PROTEGIDAS (requieren token) ==========

// GET /api/patients - Listar pacientes (protegido)
app.get('/api/patients', (req, res) => {
  console.log('📋 Listando pacientes - Usuario:', req.user?.email);
  
  // Datos simulados (en producción, obtener de MySQL)
  const mockPatients = [
    {
      id: 1,
      first_name: 'Ana',
      last_name: 'García',
      phone: '555-1111',
      email: 'ana@ejemplo.com',
      lead_status: 'Nuevo',
      created_at: '2026-02-01T10:00:00Z',
      created_by: req.user?.userId || 1
    },
    {
      id: 2,
      first_name: 'Luis',
      last_name: 'Martínez',
      phone: '555-2222',
      email: 'luis@ejemplo.com',
      lead_status: 'Contactado',
      created_at: '2026-02-02T14:30:00Z',
      created_by: req.user?.userId || 1
    },
    {
      id: 3,
      first_name: 'Carlos',
      last_name: 'Rodríguez',
      phone: '555-3333',
      email: 'carlos@ejemplo.com',
      lead_status: 'Agendado',
      created_at: '2026-02-03T09:15:00Z',
      created_by: req.user?.userId || 1
    }
  ];
  
  res.json({
    success: true,
    count: mockPatients.length,
    data: mockPatients,
    message: 'Usando datos simulados',
    user_info: {
      id: req.user?.userId,
      email: req.user?.email,
      role: req.user?.role
    }
  });
});

// POST /api/patients - Crear paciente (protegido)
app.post('/api/patients', (req, res) => {
  console.log('➕ Creando paciente - Usuario:', req.user?.email);
  console.log('📦 Datos:', req.body);
  
  const { first_name, last_name, phone, email, lead_status, notes } = req.body;
  
  // Validación
  if (!first_name || !last_name || !phone) {
    return res.status(400).json({
      success: false,
      message: 'Nombre, apellido y teléfono son requeridos'
    });
  }
  
  // Crear paciente simulado (en producción, insertar en MySQL)
  const newPatient = {
    id: Date.now(),
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    phone: phone.trim(),
    email: email ? email.trim().toLowerCase() : null,
    lead_status: lead_status || 'Nuevo',
    notes: notes || null,
    created_by: req.user?.userId || 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: 'Paciente creado exitosamente',
    data: newPatient,
    created_by: req.user?.email
  });
});

// ========== RUTAS DE CITAS (protegidas) ==========

// GET /api/appointments - Listar citas
app.get('/api/appointments', (req, res) => {
  console.log('📅 Listando citas - Usuario:', req.user?.email);
  
  res.json({
    success: true,
    data: [
      {
        id: 1,
        patient_id: 1,
        patient_name: 'Ana García',
        date: '2026-02-10',
        time: '10:00',
        type: 'Limpieza',
        status: 'Programada',
        created_by: req.user?.userId || 1
      },
      {
        id: 2,
        patient_id: 2,
        patient_name: 'Luis Martínez',
        date: '2026-02-11',
        time: '14:30',
        type: 'Consulta',
        status: 'Confirmada',
        created_by: req.user?.userId || 1
      }
    ],
    count: 2,
    user: req.user?.email
  });
});

// POST /api/appointments - Crear cita
app.post('/api/appointments', (req, res) => {
  console.log('➕ Creando cita - Usuario:', req.user?.email);
  
  const { patient_id, date, time, type, notes } = req.body;
  
  if (!patient_id || !date || !time || !type) {
    return res.status(400).json({
      success: false,
      message: 'Paciente, fecha, hora y tipo son requeridos'
    });
  }
  
  const newAppointment = {
    id: Date.now(),
    patient_id,
    date,
    time,
    type,
    notes: notes || null,
    status: 'Programada',
    created_by: req.user?.userId || 1,
    created_at: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: 'Cita creada exitosamente',
    data: newAppointment,
    created_by: req.user?.email
  });
});

// ========== RUTA DE PRUEBA PARA VERIFICAR TOKEN ==========
app.get('/api/auth/verify', (req, res) => {
  // Esta ruta verifica si el token es válido
  res.json({
    success: true,
    message: 'Token válido',
    user: req.user,
    token_info: {
      issued_at: new Date(req.user.iat * 1000).toISOString(),
      expires_at: new Date(req.user.exp * 1000).toISOString(),
      expires_in: Math.floor((req.user.exp * 1000 - Date.now()) / 1000) + ' segundos'
    }
  });
});

// ========== MANEJO DE ERRORES ==========

// Ruta no encontrada
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.url,
    method: req.method,
    available_routes: [
      'GET /',
      'GET /health',
      'GET /api/test',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/me (Requiere token)',
      'GET /api/auth/verify (Requiere token)',
      'GET /api/patients (Requiere token)',
      'POST /api/patients (Requiere token)',
      'GET /api/appointments (Requiere token)',
      'POST /api/appointments (Requiere token)'
    ],
    tip: 'Para rutas protegidas, incluir header: Authorization: Bearer <token>'
  });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('🔥 ERROR GLOBAL:', err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';
  
  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { 
      error: err.message,
      stack: err.stack 
    })
  });
});

// ========== INICIAR SERVIDOR ==========
const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 NOVADENT CRM BACKEND INICIADO - CON JWT');
  console.log('='.repeat(70));
  console.log(`✅ Servidor local: http://localhost:${PORT}`);
  console.log(`✅ Railway URL: https://novadent-backend-production.up.railway.app`);
  console.log(`✅ Health Check: /health`);
  console.log(`✅ Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ JWT Habilitado: Sí (${JWT_SECRET.substring(0, 10)}...)`);
  console.log(`📊 Memoria: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
  console.log('='.repeat(70));
  console.log('🔐 ENDPOINTS PÚBLICOS:');
  console.log('  GET  /                    - Ruta principal');
  console.log('  GET  /health              - Health check (para UptimeRobot)');
  console.log('  GET  /api/test            - Test API');
  console.log('  POST /api/auth/login      - Login (email, password) → Obtiene token JWT');
  console.log('  POST /api/auth/register   - Registro (name, email, password) → Obtiene token JWT');
  console.log('');
  console.log('🔒 ENDPOINTS PROTEGIDOS (requieren token JWT):');
  console.log('  GET  /api/auth/me         - Info usuario actual');
  console.log('  GET  /api/auth/verify     - Verificar token');
  console.log('  GET  /api/patients        - Listar pacientes');
  console.log('  POST /api/patients        - Crear paciente');
  console.log('  GET  /api/appointments    - Listar citas');
  console.log('  POST /api/appointments    - Crear cita');
  console.log('');
  console.log('📝 USO DE TOKEN JWT:');
  console.log('  Header: Authorization: Bearer <token_jwt>');
  console.log('  Token válido por: 24 horas');
  console.log('='.repeat(70) + '\n');
});

// Manejo de cierre elegante
process.on('SIGTERM', () => {
  console.log('🛑 Recibido SIGTERM, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Recibido SIGINT, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});

module.exports = { app, server, JWT_SECRET };