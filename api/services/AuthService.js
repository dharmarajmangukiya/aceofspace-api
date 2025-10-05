const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const EmailService = require('../services/EmailService');


module.exports = {
  /**
   * Register a new user (with OTP)
   */
  register: async ({ firstName, lastName, email, password, role }) => {
    try {
      // ---------------- Validations ----------------
      if (!firstName || firstName.trim() === '') {
        return ResponseService.fail('Please enter first name');
      }
      if (!lastName || lastName.trim() === '') {
        return ResponseService.fail('Please enter last name');
      }
      if (!email || email.trim() === '') {
        return ResponseService.fail('Please enter email');
      }
      if (!sails.helpers.validateEmail(email)) {
        return ResponseService.fail('Invalid email format');
      }
      if (!password || password.length < 6) {
        return ResponseService.fail('Password must be at least 6 characters');
      }

      // ---------------- Check if user exists ----------------
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return ResponseService.fail('Email already registered');
      }

      // ---------------- Hash password ----------------
      const hashedPassword = await bcrypt.hash(password, 10);

      // ---------------- Role assignment ----------------
      let userRole;
      if (role) {
        userRole = await Role.findOne({ name: role });
        if (!userRole) {
          return ResponseService.fail(`Role "${role}" not found. Please contact admin.`);
        }
      } else {
        userRole = await Role.findOne({ name: 'User' });
        if (!userRole) {
          return ResponseService.fail('Default role "User" not found. Please contact admin.');
        }
      }

      // ---------------- Generate OTP ----------------
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = Date.now() + 5 * 60 * 1000;


      try {
        await EmailService.sendOtp(email, otp);
      } catch (mailErr) {
        sails.log.error('OTP email sending failed:', mailErr);
        return res.json(ResponseService.fail('Could not send OTP email. Please try again later.'));
      }




      // ---------------- Only if mail is sent, create user ----------------
      const newUser = await User.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: userRole.id,
        isActive: false,
        otp,
        otpExpiry,
      }).fetch();

      delete newUser.password;

      return ResponseService.success(
        'Registration successful. Please verify OTP sent to your email.',
        // { id: newUser.id, email: newUser.email,otp: otp }
        { id: newUser.id, email: newUser.email }
      );
    } catch (err) {
      sails.log.error(err);
      return ResponseService.fail('Something went wrong during registration');
    }
  },


  /**
   * Verify OTP
   */
  verifyOtp: async ({ email, otp }) => {
    try {
      if (!email || !otp) {
        return ResponseService.fail('Email and OTP are required');
      }

      const user = await User.findOne({ email });
      if (!user) return ResponseService.fail('User not found');

      if (!user.otp || !user.otpExpiry) {
        return ResponseService.fail('OTP not generated');
      }

      if (Date.now() > user.otpExpiry) {
        return ResponseService.fail('OTP expired');
      }

      if (user.otp !== otp) {
        return ResponseService.fail('Invalid OTP');
      }

      // Activate user
      await User.updateOne({ id: user.id }).set({
        isActive: true,
        otp: null,
        otpExpiry: null,
      });

      return ResponseService.success('Account verified successfully');
    } catch (err) {
      sails.log.error(err);
      return ResponseService.fail('Something went wrong during OTP verification');
    }
  },

  /**
   * Login user
   */

  login: async ({ email, password }) => {
    try {
      if (!email) return ResponseService.fail('Please enter email');
      if (!password) return ResponseService.fail('Please enter password');

      const user = await User.findOne({ email }).populate('role');
      if (!user) return ResponseService.fail('User not found');

      if (!user.isActive) {
        return ResponseService.fail('Account not verified. Please verify OTP.');
      }

      // Validate password
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return ResponseService.fail('Invalid email or password');

      // Use secrets from config
      const jwtSecret = sails.config.custom.jwtSecret || 'mySuperSecretKey123';
      const refreshTokenSecret = sails.config.custom.refreshTokenSecret || 'REFRESH_TOKEN_SECRET';

      // Prepare payload
      const payload = {
        userId: user.id,
        role: user.role ? user.role.name : null
      };

      // Generate tokens
      const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
      const refreshToken = jwt.sign(payload, refreshTokenSecret, { expiresIn: '30d' });

      // Remove sensitive info
      delete user.password;

      return ResponseService.success('Login successful', {
        token: accessToken,
        refreshToken,
        user
      });
    } catch (err) {
      sails.log.error(err);
      return ResponseService.fail('Something went wrong during login');
    }
  },


  /**
   * Resend otp
   */
  resendOtp: async ({ email }) => {
    try {
      if (!email) {
        return ResponseService.fail('Email is required');
      }

      const user = await User.findOne({ email }).populate('role');
      if (!user) {
        return ResponseService.fail('User not found');
      }

      // ---------------- Generate OTP ----------------
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = Date.now() + 5 * 60 * 1000;

      try {
        await EmailService.sendOtp(email, otp);
      } catch (mailErr) {
        sails.log.error('OTP email sending failed:', mailErr);
        return res.json(ResponseService.fail('Could not send OTP email. Please try again later.'));
      }
      // Update user
      const updatedUser = await User.updateOne({ id: user.id }).set({
        otp,
        otpExpiry,
        isActive: false, // still inactive until OTP verified
      });

      if (!updatedUser) {
        return ResponseService.fail('Failed to update user with OTP');
      }

      delete updatedUser.password; // hide password

      // return ResponseService.success('OTP resent successfully', updatedUser);
      return ResponseService.success('OTP resent successfully');

    } catch (err) {
      sails.log.error('Resend OTP error:', err);
      return ResponseService.fail('Something went wrong while resending OTP');
    }
  },


  /**
 * Forgot Password
 */

  forgotPassword: async ({ email }) => {
    try {
      if (!email) return ResponseService.fail('Email is required');

      const user = await User.findOne({ email });
      if (!user) return ResponseService.fail('User not found');

      // Generate reset token and expiry (valid for 5 mins)
      const resetToken = crypto.randomBytes(20).toString('hex');
      const resetTokenExpiry = Date.now() + 5 * 60 * 1000;

      await User.updateOne({ id: user.id }).set({
        resetToken,
        resetTokenExpiry,
      });

      // Reset link using sails.config.custom.frontendUrl
      const resetLink = `${sails.config.custom.frontendUrl}/auth/reset-password?token=${resetToken}`;

      // Send mail
      try {
        await EmailService.sendMail(
          email,
          'Password Reset Request',
          `
            <p>Hello ${user.firstName || 'User'},</p>
            <p>Click the link below to reset your password (valid for 5 minutes):</p>
            <a href="${resetLink}" target="_blank">${resetLink}</a>
            <p>If you did not request this, ignore this email.</p>
          `
        );
      } catch (mailErr) {
        sails.log.error('Reset password email failed:', mailErr);
        return ResponseService.fail('Could not send password reset email.');
      }



      return ResponseService.success('Password reset link sent to your email.');
    } catch (err) {
      sails.log.error('Forgot Password Error:', err);
      return ResponseService.fail('Something went wrong while requesting password reset.');
    }
  },




  /**
   * Reset Password
   */
  resetPassword: async ({ email, token, password }) => {
    try {
      // ---------- Basic Validations ----------
      if (!email) return ResponseService.fail('Email is required');
      if (!token) return ResponseService.fail('Reset token is required');
      if (!password) return ResponseService.fail('New password is required');
      if (password.length < 6) return ResponseService.fail('Password must be at least 6 characters');

      // ---------- Find User ----------
      const user = await User.findOne({ email, resetToken: token });
      if (!user) return ResponseService.fail('Invalid or expired reset token');

      // ---------- Check Token Expiry ----------
      if (Date.now() > user.resetExpiry) {
        return ResponseService.fail('Reset token has expired');
      }

      // ---------- Hash & Update Password ----------
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.updateOne({ id: user.id }).set({
        password: hashedPassword,
        resetToken: null,
        resetExpiry: null,
      });

      // ---------- Send Confirmation Email ----------
      try {
        await EmailService.sendMail(
          email,
          'Password Changed Successfully',
          `
            <p>Hello ${user.firstName || 'User'},</p>
            <p>Your password has been changed successfully.</p>
            <p>If you did not perform this action, please contact support immediately.</p>
          `
        );
      } catch (mailErr) {
        sails.log.error('Password change confirmation email failed:', mailErr);
        // don’t fail the response because password reset already succeeded
      }

      return ResponseService.success('Password reset successfully');
    } catch (err) {
      sails.log.error('Reset Password Error:', err);
      return ResponseService.fail('Something went wrong while resetting password');
    }
  },


};




/**
 * Utility → Send OTP mail
 */
async function sendOtpMail(email, otp) {
  let transporter = nodemailer.createTransport({
    service: 'SMTP', // or SMTP OR gmail
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"AceOfSpace" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP is ${otp}. It will expire in 1 minute.`,
  });
}
