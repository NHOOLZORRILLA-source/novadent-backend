const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Error de MySQL
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({
      error: 'Ya existe un registro con esos datos',
      details: err.sqlMessage
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      error: 'Referencia inválida. Verifica los datos relacionados',
      details: err.sqlMessage
    });
  }

  // Error de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      details: err.message
    });
  }

  // Error por defecto
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;