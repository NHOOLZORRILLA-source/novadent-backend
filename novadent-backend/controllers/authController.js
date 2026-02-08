const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');

// Login de usuario
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Validar que vengan los datos
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email y contraseña son requeridos'
    });
  }

  try {
    const pool = getConnection();

    // Buscar usuario por email
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ? AND active = TRUE',
      [email]
    );

    // Verificar si existe el usuario
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const user = users[0];

    // Comparar contraseña
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Actualizar último login
    await pool.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Generar token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET || 'tu_secreto_super_seguro_aqui',
      { expiresIn: '24h' }
    );

    // Respuesta exitosa
    res.json({
      success: true,
      message: 'Login exitoso',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.last_login
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// Obtener perfil del usuario autenticado
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const pool = getConnection();

    const [users] = await pool.execute(
      'SELECT id, name, email, role, last_login, created_at FROM users WHERE id = ? AND active = TRUE',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user: users[0]
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// Cambiar contraseña
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Se requiere la contraseña actual y la nueva'
    });
  }

  // Validar longitud de nueva contraseña
  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'La nueva contraseña debe tener al menos 8 caracteres'
    });
  }

  try {
    const pool = getConnection();

    // Obtener usuario actual
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ? AND active = TRUE',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = users[0];

    // Verificar contraseña actual
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// Logout
exports.logout = (req, res) => {
  // El logout principalmente se maneja del lado del cliente eliminando el token
  // Aquí podríamos registrar en audit_log si quisiéramos
  res.json({
    success: true,
    message: 'Logout exitoso'
  });
};