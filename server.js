require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Conectar a la base de datos
connectDB();

// Ruta principal
app.get('/', (req, res) => {
  res.json({ 
    message: '🦷 NovaDent CRM Backend',
    status: 'Funcionando correctamente',
    version: '1.0.0'
  });
});

// Importar rutas
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Iniciar servidor
app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('🚀 NovaDent CRM Backend');
  console.log('========================================');
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`🌐 Entorno: ${process.env.APP_ENV || 'development'}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log('========================================\n');
});