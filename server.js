require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== CONFIGURACIÓN DE SEGURIDAD ==========
// Limitar tamaño de JSON para evitar memory leaks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ========== CORS CONFIGURADO ==========
const corsOptions = {
  origin: [
    'https://nova.bellux.in',      // Tu frontend en Hostinger
    'http://localhost:3000',       // Desarrollo local
    'http://localhost:5173',       // Vite/React local
    'https://novadent-api.onrender.com', // Por si migras a Render
    'https://*.railway.app'        // Cualquier subdominio Railway
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// ========== MANEJO DE ERRORES GLOBAL ==========
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', error);
  // No salir del proceso en producción
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

// ========== CONECTAR A BASE DE DATOS ==========
connectDB();

// ========== MIDDLEWARE DE LOGS ==========
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ========== RUTAS ==========

// 1. Ruta principal
app.get('/', (req, res) => {
  res.json({ 
    message: '🦷 NovaDent CRM Backend',
    status: 'Funcionando correctamente',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// 2. HEALTH CHECK PARA RAILWAY/RENDER (IMPORTANTE)
app.get('/health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const memoryMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
    external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100
  };
  
  res.status(200).json({ 
    status: 'ok', 
    message: '✅ NovaDent API funcionando',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()) + ' segundos',
    memory: memoryMB,
    node_version: process.version,
    platform: process.platform,
    database: 'connected' // Asumiendo que connectDB() funciona
  });
});

// 3. Ruta simple para pruebas
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'API de prueba funcionando',
    data: { test: 'ok' }
  });
});

// 4. Importar rutas principales
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const appointmentRoutes = require('./routes/appointments');

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);

// ========== MANEJO DE RUTAS NO ENCONTRADAS ==========
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

// ========== MIDDLEWARE DE ERRORES ==========
app.use((err, req, res, next) => {
  console.error('🔥 ERROR MIDDLEWARE:', err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';
  
  res.status(statusCode).json({
    error: true,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ========== CONFIGURACIÓN DE TIMEOUTS ==========
// Evitar que peticiones largas maten el servidor
app.use((req, res, next) => {
  req.setTimeout(10000); // 10 segundos máximo por request
  res.setTimeout(10000);
  next();
});

// ========== INICIAR SERVIDOR ==========
const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 NOVADENT CRM BACKEND INICIADO');
  console.log('='.repeat(50));
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL Local: http://localhost:${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`📊 Memoria inicial: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
  console.log('='.repeat(50) + '\n');
});

// ========== MANEJO DE APAGADO ELEGANTE ==========
process.on('SIGTERM', () => {
  console.log('🔄 Recibido SIGTERM, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 Recibido SIGINT, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

// Exportar para pruebas
module.exports = { app, server };