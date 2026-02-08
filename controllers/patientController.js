const { getConnection } = require('../config/database');

// Obtener todos los pacientes
exports.getPatients = async (req, res) => {
  try {
    const { search, leadStatus, siteId, limit = 100, offset = 0 } = req.query;
    const pool = getConnection();

    let query = `
      SELECT p.*, s.name as site_name 
      FROM patients p
      LEFT JOIN sites s ON p.site_id = s.id
      WHERE 1=1
    `;
    const params = [];

    // Búsqueda
    if (search) {
      query += ` AND (
        p.first_name LIKE ? OR 
        p.last_name LIKE ? OR 
        p.phone LIKE ? OR 
        p.email LIKE ?
      )`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    // Filtro por estado
    if (leadStatus && leadStatus !== 'Todos') {
      query += ` AND p.lead_status = ?`;
      params.push(leadStatus);
    }

    // Filtro por sede
    if (siteId && siteId !== 'Todas') {
      query += ` AND p.site_id = ?`;
      params.push(siteId);
    }

    query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [patients] = await pool.query(query, params);

    // Contar total
    let countQuery = `SELECT COUNT(*) as total FROM patients p WHERE 1=1`;
    const countParams = [];

    if (search) {
      countQuery += ` AND (
        p.first_name LIKE ? OR 
        p.last_name LIKE ? OR 
        p.phone LIKE ? OR 
        p.email LIKE ?
      )`;
      const searchParam = `%${search}%`;
      countParams.push(searchParam, searchParam, searchParam, searchParam);
    }

    if (leadStatus && leadStatus !== 'Todos') {
      countQuery += ` AND p.lead_status = ?`;
      countParams.push(leadStatus);
    }

    if (siteId && siteId !== 'Todas') {
      countQuery += ` AND p.site_id = ?`;
      countParams.push(siteId);
    }

    const [countResult] = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      total: countResult[0].total,
      count: patients.length,
      patients
    });

  } catch (error) {
    console.error('Error al obtener pacientes:', error);
    res.status(500).json({
      error: 'Error al obtener pacientes',
      details: error.message
    });
  }
};

// Obtener un paciente por ID
exports.getPatientById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getConnection();

    const [patients] = await pool.query(
      `SELECT p.*, s.name as site_name 
       FROM patients p
       LEFT JOIN sites s ON p.site_id = s.id
       WHERE p.id = ?`,
      [id]
    );

    if (patients.length === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado'
      });
    }

    // Obtener citas del paciente
    const [appointments] = await pool.query(
      `SELECT a.*, d.name as doctor_name 
       FROM appointments a
       LEFT JOIN doctors d ON a.doctor_id = d.id
       WHERE a.patient_id = ?
       ORDER BY a.date DESC, a.time DESC
       LIMIT 10`,
      [id]
    );

    // Obtener puntos de lealtad
    const [loyaltyPoints] = await pool.query(
      `SELECT * FROM loyalty_points 
       WHERE patient_id = ?
       ORDER BY date DESC
       LIMIT 10`,
      [id]
    );

    // Obtener odontogramas
    const [odontograms] = await pool.query(
      `SELECT * FROM odontograms 
       WHERE patient_id = ?
       ORDER BY date DESC
       LIMIT 5`,
      [id]
    );

    res.json({
      success: true,
      patient: patients[0],
      appointments,
      loyaltyPoints,
      odontograms
    });

  } catch (error) {
    console.error('Error al obtener paciente:', error);
    res.status(500).json({
      error: 'Error al obtener paciente',
      details: error.message
    });
  }
};

// Crear nuevo paciente
exports.createPatient = async (req, res) => {
  try {
    const data = req.body;
    const pool = getConnection();

    // Validaciones básicas
    if (!data.firstName || !data.lastName || !data.phone) {
      return res.status(400).json({
        error: 'Los campos nombres, apellidos y teléfono son obligatorios'
      });
    }

    // Verificar si el teléfono ya existe
    const [existing] = await pool.query(
      'SELECT id FROM patients WHERE phone = ?',
      [data.phone]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        error: 'Ya existe un paciente con ese número de teléfono'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO patients (
        first_name, last_name, phone, email, birth_date, address,
        medical_history, communication_preference, referral_source,
        lead_status, points, site_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.firstName,
        data.lastName,
        data.phone,
        data.email || null,
        data.birthDate || null,
        data.address || null,
        data.medicalHistory || null,
        data.communicationPreference || 'whatsapp',
        data.referralSource || null,
        data.leadStatus || 'Nuevo',
        data.points || 0,
        data.siteId || null
      ]
    );

    // Registrar en auditoría
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id) 
       VALUES (?, 'CREATE_PATIENT', 'patient', ?)`,
      [req.user.id, result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Paciente registrado exitosamente',
      patientId: result.insertId
    });

  } catch (error) {
    console.error('Error al crear paciente:', error);
    res.status(500).json({
      error: 'Error al crear paciente',
      details: error.message
    });
  }
};

// Actualizar paciente
exports.updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const pool = getConnection();

    // Verificar que el paciente existe
    const [existing] = await pool.query(
      'SELECT id FROM patients WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado'
      });
    }

    // Construir query dinámico
    const updates = [];
    const values = [];

    if (data.firstName !== undefined) {
      updates.push('first_name = ?');
      values.push(data.firstName);
    }
    if (data.lastName !== undefined) {
      updates.push('last_name = ?');
      values.push(data.lastName);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (data.birthDate !== undefined) {
      updates.push('birth_date = ?');
      values.push(data.birthDate);
    }
    if (data.address !== undefined) {
      updates.push('address = ?');
      values.push(data.address);
    }
    if (data.medicalHistory !== undefined) {
      updates.push('medical_history = ?');
      values.push(data.medicalHistory);
    }
    if (data.communicationPreference !== undefined) {
      updates.push('communication_preference = ?');
      values.push(data.communicationPreference);
    }
    if (data.referralSource !== undefined) {
      updates.push('referral_source = ?');
      values.push(data.referralSource);
    }
    if (data.leadStatus !== undefined) {
      updates.push('lead_status = ?');
      values.push(data.leadStatus);
    }
    if (data.points !== undefined) {
      updates.push('points = ?');
      values.push(data.points);
    }
    if (data.siteId !== undefined) {
      updates.push('site_id = ?');
      values.push(data.siteId);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No se proporcionaron campos para actualizar'
      });
    }

    values.push(id);

    await pool.query(
      `UPDATE patients SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Registrar en auditoría
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id) 
       VALUES (?, 'UPDATE_PATIENT', 'patient', ?)`,
      [req.user.id, id]
    );

    res.json({
      success: true,
      message: 'Paciente actualizado correctamente'
    });

  } catch (error) {
    console.error('Error al actualizar paciente:', error);
    res.status(500).json({
      error: 'Error al actualizar paciente',
      details: error.message
    });
  }
};

// Eliminar paciente
exports.deletePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getConnection();

    const [result] = await pool.query(
      'DELETE FROM patients WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado'
      });
    }

    // Registrar en auditoría
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id) 
       VALUES (?, 'DELETE_PATIENT', 'patient', ?)`,
      [req.user.id, id]
    );

    res.json({
      success: true,
      message: 'Paciente eliminado correctamente'
    });

  } catch (error) {
    console.error('Error al eliminar paciente:', error);
    res.status(500).json({
      error: 'Error al eliminar paciente',
      details: error.message
    });
  }
};

// Obtener estadísticas de pacientes
exports.getPatientStats = async (req, res) => {
  try {
    const pool = getConnection();

    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_patients,
        SUM(CASE WHEN lead_status = 'Nuevo' THEN 1 ELSE 0 END) as new_patients,
        SUM(CASE WHEN lead_status = 'Convertido' THEN 1 ELSE 0 END) as converted_patients,
        AVG(points) as avg_points
      FROM patients
    `);

    res.json({
      success: true,
      stats: stats[0]
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      error: 'Error al obtener estadísticas',
      details: error.message
    });
  }
};