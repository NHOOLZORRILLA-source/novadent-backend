const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// Rutas públicas
router.post('/login', authController.login);

// Rutas protegidas
router.get('/profile', auth, authController.getProfile);
router.put('/change-password', auth, authController.changePassword);
router.post('/logout', auth, authController.logout);

module.exports = router;