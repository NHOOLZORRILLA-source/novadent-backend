const { getConnection } = require('../config/database');

// Obtener todas las citas
exports.getAppointments = async (req, res) => {
  try {
    const { startDate, endDate, status, doctorId, siteId, limit = 100 } = req.query;
    const pool = getConnection();

    let query = `
      SELECT 
        a.*,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        p.phone as patient_phone,
        d.name as doctor_name,
        s.name as site_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN sites s ON a.site_id = s.id
      WHERE 1=1
    `;
    const params = [];

    // Filtro por rango de fechas
    if (startDate) {
      query += ` AND a.date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND a.date <= ?`;
      params.push(endDate);
    }

    // Filtro por estado
    if (status && status !== 'Todas') {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    // Filtro por doctor
    if (doctorId && doctorId !== 'Todos') {
      query += ` AND a.doctor_id = ?`;
      params.push(doctorId);
    }

    // Filtro por sede
    if (siteId && siteId !== 'Todas') {
      query += ` AND a.site_id = ?`;
      params.push(siteId);
    }

    query += ` ORDER BY a.date DESC, a.time DESC LIMIT ?`;
    params.push(parseInt(limit));

    const [appointments] = await pool.query(query, params);

    res.json({
      success: true,
      count: appointments.length,
      appointments
    });

  } catch (error) {
    console.error('Error al obtener citas:', error);
    res.status(500).json({
      error: 'Error al obtener citas',
      details: error.message
    });
  }
};

// Obtener cita por ID
exports.getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getConnection();

    const [appointments] = await pool.query(
      `SELECT 
        a.*,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        p.phone as patient_phone,
        p.email as patient_email,
        d.name as doctor_name,
        s.name as site_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN sites s ON a.site_id = s.id
      WHERE a.id = ?`,
      [id]
    );

    if (appointments.length === 0) {
      return res.status(404).json({
        error: 'Cita no encontrada'
      });
    }

    res.json({
      success: true,
      appointment: appointments[0]
    });

  } catch (error) {
    console.error('Error al obtener cita:', error);
    res.status(500).json({
      error: 'Error al obtener cita',
      details: error.message
    });
  }
};

// Crear nueva cita
exports.createAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, siteId, date, time, treatment, status, notes } = req.body;
    const pool = getConnection();

    // Validaciones
    if (!patientId || !date || !time) {
      return res.status(400).json({
        error: 'Los campos paciente, fecha y hora son obligatorios'
      });
    }

    // Verificar que el paciente existe
    const [patient] = await pool.query(
      'SELECT id FROM patients WHERE id = ?',
      [patientId]
    );

    if (patient.length === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado'
      });
    }

    // Verificar conflictos de horario (opcional)
    const [conflicts] = await pool.query(
      `SELECT id FROM appointments 
       WHERE date = ? AND time = ? AND doctor_id = ? AND status != 'Cancelada'`,
      [date, time, doctorId]
    );

    if (conflicts.length > 0) {
      return res.status(400).json({
        error: 'Ya existe una cita agendada en ese horario para el doctor seleccionado'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO appointments (
        patient_id, doctor_id, site_id, date, time, treatment, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        doctorId || null,
        siteId || null,
        date,
        time,
        treatment || null,
        status || 'Pendiente',
        notes || null
      ]
    );

    // Registrar en auditoría
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id) 
       VALUES (?, 'CREATE_APPOINTMENT', 'appointment', ?)`,
      [req.user.id, result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Cita agendada exitosamente',
      appointmentId: result.insertId
    });

  } catch (error) {
    console.error('Error al crear cita:', error);
    res.status(500).json({
      error: 'Error al crear cita',
      details: error.message
    });
  }
};

// Actualizar cita
exports.updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const pool = getConnection();

    // Verificar que la cita existe
    const [existing] = await pool.query(
      'SELECT id FROM appointments WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Cita no encontrada'
      });
    }

    // Construir query dinámico
    const updates = [];
    const values = [];

    if (data.patientId !== undefined) {
      updates.push('patient_id = ?');
      values.push(data.patientId);
    }
    if (data.doctorId !== undefined) {
      updates.push('doctor_id = ?');
      values.push(data.doctorId);
    }
    if (data.siteId !== undefined) {
      updates.push('site_id = ?');
      values.push(data.siteId);
    }
    if (data.date !== undefined) {
      updates.push('date = ?');
      values.push(data.date);
    }
    if (data.time !== undefined) {
      updates.push('time = ?');
      values.push(data.time);
    }
    if (data.treatment !== undefined) {
      updates.push('treatment = ?');
      values.push(data.treatment);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      values.push(data.notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No se proporcionaron campos para actualizar'
      });
    }

    values.push(id);

    await pool.query(
      `UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Registrar en auditoría
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id) 
       VALUES (?, 'UPDATE_APPOINTMENT', 'appointment', ?)`,
      [req.user.id, id]
    );

    res.json({
      success: true,
      message: 'Cita actualizada correctamente'
    });

  } catch (error) {
    console.error('Error al actualizar cita:', error);
    res.status(500).json({
      error: 'Error al actualizar cita',
      details: error.message
    });
  }
};

// Eliminar cita
exports.deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getConnection();

    const [result] = await pool.query(
      'DELETE FROM appointments WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Cita no encontrada'
      });
    }

    // Registrar en auditoría
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id) 
       VALUES (?, 'DELETE_APPOINTMENT', 'appointment', ?)`,
      [req.user.id, id]
    );

    res.json({
      success: true,
      message: 'Cita eliminada correctamente'
    });

  } catch (error) {
    console.error('Error al eliminar cita:', error);
    res.status(500).json({
      error: 'Error al eliminar cita',
      details: error.message
    });
  }
};

// Obtener estadísticas de citas
exports.getAppointmentStats = async (req, res) => {
  try {
    const pool = getConnection();

    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_appointments,
        SUM(CASE WHEN status = 'Confirmada' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'Pendiente' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'Completada' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN date = CURDATE() THEN 1 ELSE 0 END) as today
      FROM appointments
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