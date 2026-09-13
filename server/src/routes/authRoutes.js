'use strict';
const express = require('express');
const router = express.Router();
const {
  register, login, verifyLoginOtp, resendLoginOtp, getMe,
  registerValidation, loginValidation, verifyOtpValidation, resendOtpValidation
} = require('../controllers/authController');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');

// POST /api/auth/register — public
router.post('/register', registerValidation, validate, register);

// POST /api/auth/login — public
router.post('/login', loginValidation, validate, login);

// POST /api/auth/verify-login-otp — public
router.post('/verify-login-otp', verifyOtpValidation, validate, verifyLoginOtp);

// POST /api/auth/resend-login-otp — public
router.post('/resend-login-otp', resendOtpValidation, validate, resendLoginOtp);

// GET /api/auth/me — protected
router.get('/me', auth, getMe);

module.exports = router;
