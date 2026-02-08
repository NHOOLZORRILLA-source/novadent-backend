// config/database.js - Versión CORREGIDA
const mysql = require('mysql2/promise');

// Configuración de conexión
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'novadent_crm',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Función para conectar y probar
async function connectDB() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conectado a MySQL correctamente');
    
    // Probar consulta simple
    const [rows] = await connection.query('SELECT 1 + 1 AS result');
    console.log('📊 Test query result:', rows[0].result);
    
    // Verificar tablas
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`📊 Tablas en la base: ${tables.length}`);
    
    connection.release();
    return pool;
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error.message);
    console.log('⚠️ Usando datos de prueba (modo simulación)');
    
    // Retornar pool simulado para evitar crash
    return {
      query: async () => {
        console.log('📝 Usando MySQL simulado (datos de prueba)');
        return [[], []];
      },
      getConnection: async () => ({
        query: async () => [[], []],
        release: () => {}
      })
    };
  }
}

// Función para obtener conexión (compatible con tu código)
function getConnection() {
  return pool.getConnection();
}

module.exports = {
  connectDB,
  getConnection,
  pool
};