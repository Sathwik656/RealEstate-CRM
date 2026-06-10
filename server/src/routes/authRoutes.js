'use strict';
const express = require('express');
const router = express.Router();
const {
  register, login, getMe,
  registerValidation, loginValidation,
} = require('../controllers/authController');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');

// POST /api/auth/register — public
router.post('/register', registerValidation, validate, register);

// POST /api/auth/login — public
router.post('/login', loginValidation, validate, login);

// GET /api/auth/me — protected
router.get('/me', auth, getMe);

module.exports = router;
