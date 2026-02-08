const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

const connectDB = async () => {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      timezone: '-05:00', // Zona horaria de Perú
      dateStrings: true
    });

    // Verificar conexión
    const connection = await pool.getConnection();
    console.log('✅ Conectado a MySQL en Hostinger');
    connection.release();

    // Crear tablas si no existen
    await createTables();
    
    // Crear usuario admin por defecto
    await createDefaultAdmin();
    
    return pool;
  } catch (error) {
    console.error('❌ Error de conexión a MySQL:', error.message);
    throw error;
  }
};

const createTables = async () => {
  const connection = await pool.getConnection();
  
  try {
    console.log('📋 Creando/verificando tablas...');

    // Tabla de Usuarios (Solo Admin)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(200) NOT NULL,
        role ENUM('admin') DEFAULT 'admin',
        active BOOLEAN DEFAULT TRUE,
        last_login DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_active (active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla de Sedes
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sites (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(200) NOT NULL,
        address TEXT,
        phone VARCHAR(20),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_active (active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla de Doctores
    await connection.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(200) NOT NULL,
        specialty VARCHAR(150),
        email VARCHAR(150) UNIQUE NOT NULL,
        phone VARCHAR(20),
        site_ids JSON,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_active (active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla de Pacientes
    await connection.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(150),
        birth_date DATE,
        address TEXT,
        medical_history TEXT,
        communication_preference ENUM('whatsapp', 'email', 'sms') DEFAULT 'whatsapp',
        referral_source VARCHAR(100),
        lead_status ENUM('Nuevo', 'Contactado', 'En seguimiento', 'Convertido') DEFAULT 'Nuevo',
        points INT DEFAULT 0,
        site_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_phone (phone),
        INDEX idx_email (email),
        INDEX idx_lead_status (lead_status),
        INDEX idx_site (site_id),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla de Citas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        patient_id VARCHAR(36) NOT NULL,
        doctor_id VARCHAR(36),
        site_id VARCHAR(36),
        date DATE NOT NULL,
        time TIME NOT NULL,
        treatment VARCHAR(200),
        status ENUM('Confirmada', 'Pendiente', 'Completada', 'Cancelada') DEFAULT 'Pendiente',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_patient (patient_id),
        INDEX idx_doctor (doctor_id),
        INDEX idx_date (date),
        INDEX idx_status (status),
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla de Facturas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        patient_id VARCHAR(36) NOT NULL,
        appointment_id VARCHAR(36),
        site_id VARCHAR(36),
        date DATE NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_method ENUM('Tarjeta', 'Contado', 'Financiamiento', 'Seguro') DEFAULT 'Contado',
        status ENUM('Pagada', 'Pendiente', 'Vencida') DEFAULT 'Pendiente',
        insurance_company VARCHAR(150),
        insurance_policy VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_patient (patient_id),
        INDEX idx_status (status),
        INDEX idx_date (date),
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla de Inventario
    await connection.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(100),
        unit VARCHAR(50),
        site_id VARCHAR(36),
        current_stock INT DEFAULT 0,
        min_stock INT DEFAULT 0,
        location VARCHAR(100),
        supplier VARCHAR(150),
        expiry_date DATE,
        lot_number VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_code (code),
        INDEX idx_site (site_id),
        INDEX idx_stock (current_stock),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla de Movimientos de Inventario
    await connection.query(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        item_id VARCHAR(36) NOT NULL,
        type ENUM('Entrada', 'Salida', 'Transferencia') NOT NULL,
        quantity INT NOT NULL,
        site_id VARCHAR(36),
        destination_site_id VARCHAR(36),
        reference VARCHAR(100),
        notes TEXT,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_item (item_id),
        INDEX idx_date (date),
        FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE CASCADE,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla de Leads
    await connection.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(200) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(150),
        source VARCHAR(100),
        status ENUM('Nuevo', 'Contactado', 'En seguimiento', 'Convertido') DEFAULT 'Nuevo',
        site_id VARCHAR(36),
        campaign_id VARCHAR(36),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_source (source),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla de Campañas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(200) NOT NULL,
        platform VARCHAR(100),
        start_date DATE NOT NULL,
        end_date DATE,
        budget DECIMAL(10, 2),
        leads_generated INT DEFAULT 0,
        conversions INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_start_date (start_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla de Puntos de Lealtad
    await connection.query(`
      CREATE TABLE IF NOT EXISTS loyalty_points (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        patient_id VARCHAR(36) NOT NULL,
        type VARCHAR(100) NOT NULL,
        points INT NOT NULL,
        date DATE NOT NULL,
        metadata JSON,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_patient (patient_id),
        INDEX idx_date (date),
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla de Odontogramas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS odontograms (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        patient_id VARCHAR(36) NOT NULL,
        date DATE NOT NULL,
        data JSON NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_patient (patient_id),
        INDEX idx_date (date),
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla de Auditoría
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(36),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(36),
        ip_address VARCHAR(50),
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_timestamp (timestamp),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Tablas creadas/verificadas correctamente');
    
  } catch (error) {
    console.error('❌ Error al crear tablas:', error);
    throw error;
  } finally {
    connection.release();
  }
};

const createDefaultAdmin = async () => {
  const connection = await pool.getConnection();
  
  try {
    const bcrypt = require('bcryptjs');
    
    // Verificar si ya existe el admin
    const [existing] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [process.env.ADMIN_EMAIL]
    );

    if (existing.length === 0) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      
      await connection.query(
        'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
        [process.env.ADMIN_EMAIL, hashedPassword, process.env.ADMIN_NAME, 'admin']
      );

      console.log('✅ Usuario administrador creado');
      console.log(`📧 Email: ${process.env.ADMIN_EMAIL}`);
      console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD}`);
    } else {
      console.log('ℹ️  Usuario administrador ya existe');
    }

    // Crear sedes por defecto si no existen
    const [sites] = await connection.query('SELECT COUNT(*) as count FROM sites');
    if (sites[0].count === 0) {
      await connection.query(`
        INSERT INTO sites (id, name, address, phone, active) VALUES
        ('site-1', 'NovaDent Centro', 'Av. Principal 123, Lima', '+51 1 234 5678', TRUE),
        ('site-2', 'NovaDent San Isidro', 'Calle Los Robles 456, San Isidro', '+51 1 234 5679', TRUE)
      `);
      console.log('✅ Sedes por defecto creadas');
    }
    
  } catch (error) {
    console.error('❌ Error al crear usuario admin:', error);
  } finally {
    connection.release();
  }
};

const getConnection = () => {
  if (!pool) {
    throw new Error('Base de datos no conectada. Llama a connectDB() primero.');
  }
  return pool;
};

module.exports = { connectDB, getConnection };