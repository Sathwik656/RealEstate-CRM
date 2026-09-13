'use strict';
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Resend } = require('resend');

const User = require('../models/User');
const LoginOTP = require('../models/LoginOTP');
const { generateEntityCode } = require('../utils/generateCode');

const resend = new Resend(process.env.RESEND_API_KEY);
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

// ─── Validation Rules ─────────────────────────────────────────────────────────

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'agent']).withMessage('Role must be admin or agent'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('role').optional().isIn(['admin', 'agent']).withMessage('Role must be admin or agent'),
];

const verifyOtpValidation = [
  body('verificationId').notEmpty().withMessage('Verification ID is required'),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
];

const resendOtpValidation = [
  body('verificationId').notEmpty().withMessage('Verification ID is required'),
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const sendOtpEmail = async (email, otp) => {
  try {
    await resend.emails.send({
      from: `Veenu CRM <${RESEND_FROM_EMAIL}>`,
      to: email,
      subject: 'Your Verandah Login OTP',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaec; border-radius: 8px;">
          <h2 style="color: #1a1f2e; margin-top: 0;">Your Verandah Login OTP</h2>
          <p style="color: #4b5563; font-size: 16px;">Hello,</p>
          <p style="color: #4b5563; font-size: 16px;">Your verification code is:</p>
          <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1a1f2e; border-radius: 6px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #4b5563; font-size: 14px;">This OTP is valid for 5 minutes.</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">If you did not attempt to log in to Verandah, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Resend email error:', error);
    throw new Error('Failed to send OTP email');
  }
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Register a new user (defaults to agent role if omitted) and return a JWT token.
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'agent' } = req.body;
    const userRole = role || 'agent';

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    const userData = { name, email, password, role: userRole };
    if (userRole === 'agent') {
      const { code, seqNumber } = await generateEntityCode('Agent');
      userData.code = code;
      userData.seqNumber = seqNumber;
    }

    const user = await User.create(userData);
    const token = signToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Authenticate user credentials and send OTP.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Credentials valid -> Invalidate old OTPs for this user
    await LoginOTP.deleteMany({ userId: user._id });

    // Generate secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    const loginOtp = await LoginOTP.create({
      userId: user._id,
      email: user.email,
      otpHash,
      expiresAt,
    });

    // Send email
    await sendOtpEmail(user.email, otp);

    return res.status(200).json({
      success: true,
      requiresOtp: true,
      message: 'OTP sent to your email',
      verificationId: loginOtp._id,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/verify-login-otp
 * Verify OTP and issue JWT.
 */
const verifyLoginOtp = async (req, res, next) => {
  try {
    const { verificationId, otp } = req.body;

    const otpRecord = await LoginOTP.findById(verificationId);
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification session. Please login again.' });
    }

    if (otpRecord.verified) {
      return res.status(400).json({ success: false, message: 'OTP already verified.' });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'This verification code has expired. Please request a new code.' });
    }

    if (otpRecord.attempts >= 5) {
      await LoginOTP.findByIdAndDelete(verificationId);
      return res.status(400).json({ success: false, message: 'Too many incorrect attempts. Please request a new OTP.' });
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ success: false, message: 'Invalid verification code. Please try again.' });
    }

    otpRecord.verified = true;
    await otpRecord.save();

    // Generate session
    const user = await User.findById(otpRecord.userId);
    const token = signToken(user._id);

    // Clean up OTP record
    await LoginOTP.findByIdAndDelete(verificationId);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/resend-login-otp
 * Invalidate previous OTP, generate and send a new one.
 */
const resendLoginOtp = async (req, res, next) => {
  try {
    const { verificationId } = req.body;

    const oldRecord = await LoginOTP.findById(verificationId);
    if (!oldRecord) {
      return res.status(400).json({ success: false, message: 'Invalid verification session.' });
    }

    const user = await User.findById(oldRecord.userId);
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found.' });
    }

    await LoginOTP.findByIdAndDelete(verificationId);

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const newRecord = await LoginOTP.create({
      userId: user._id,
      email: user.email,
      otpHash,
      expiresAt,
    });

    await sendOtpEmail(user.email, otp);

    return res.status(200).json({
      success: true,
      message: 'A new verification code has been sent.',
      verificationId: newRecord._id,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Return the currently authenticated user (no password).
 */
const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'User profile fetched successfully',
      data: {
        user: req.user,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  verifyLoginOtp,
  resendLoginOtp,
  getMe,
  registerValidation,
  loginValidation,
  verifyOtpValidation,
  resendOtpValidation,
};
