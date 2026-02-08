const mysql = require('mysql2/promise');

// Configuración optimizada para Railway/Render
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'novadent_crm',
  port: process.env.DB_PORT || 3306,
  
  // OPTIMIZACIONES PARA PLAN GRATUITO
  waitForConnections: true,
  connectionLimit: 3,           // REDUCIDO: menos conexiones simultáneas
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  
  // Timeouts para evitar bloqueos
  connectTimeout: 10000,        // 10 segundos máximo para conectar
  acquireTimeout: 10000,        // 10 segundos máximo para obtener conexión
  timeout: 60000                // 60 segundos máximo inactiva
});

// Función para conectar y verificar
async function connectDB() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conectado a MySQL correctamente');
    
    // Verificar tablas básicas
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`📊 Tablas en la base: ${tables.length}`);
    
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error.message);
    
    // No salir en producción, permitir que el servidor corra
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Continuando sin base de datos...');
      return false;
    } else {
      throw error;
    }
  }
}

// Función para probar conexión
async function testConnection() {
  try {
    const [rows] = await pool.query('SELECT 1 as test');
    return rows[0].test === 1;
  } catch (error) {
    console.error('❌ Test de conexión falló:', error.message);
    return false;
  }
}

// Cerrar conexiones al apagar
process.on('SIGINT', async () => {
  console.log('🔄 Cerrando conexiones MySQL...');
  await pool.end();
});

module.exports = { pool, connectDB, testConnection };