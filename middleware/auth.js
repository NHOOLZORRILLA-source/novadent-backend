const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');

const auth = async (req, res, next) => {
  try {
    // Obtener token del header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'Acceso denegado. No se proporcionó token de autenticación.'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar que el usuario existe y está activo
    const pool = getConnection();
    const [users] = await pool.query(
      'SELECT id, email, name, role, active FROM users WHERE id = ? AND active = TRUE',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: 'Usuario no autorizado o inactivo.'
      });
    }

    // Adjuntar usuario al request
    req.user = users[0];
    req.token = token;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token inválido.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado. Por favor inicie sesión nuevamente.'
      });
    }

    res.status(500).json({
      error: 'Error de autenticación.',
      details: error.message
    });
  }
};

// Middleware para verificar si es admin (aunque solo hay un tipo de usuario)
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Acceso denegado. Se requieren permisos de administrador.'
    });
  }
  next();
};

module.exports = { auth, requireAdmin };