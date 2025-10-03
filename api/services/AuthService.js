const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
// const { jwtOptions } = require('../../config/passport'); // make sure path is correct

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
      const otpExpiry = Date.now() + 60 * 1000; // 1 min expiry

      // ---------------- Try sending email FIRST ----------------
      // try {
      //   await sendOtpMail(email, otp);
      // } catch (mailErr) {
      //   sails.log.error('OTP Mail sending failed:', mailErr);
      //   return ResponseService.fail('Could not send OTP email. Please try again later.');
      // }

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

      // delete newUser.password;

      return ResponseService.success(
        'Registration successful. Please verify OTP sent to your email.',
        { id: newUser.id, email: newUser.email,otp: newUser.otp }
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

      // Generate new OTP & expiry (60 sec)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = Date.now() + 60 * 1000;

      // Update user
      const updatedUser = await User.updateOne({ id: user.id }).set({
        otp,
        otpExpiry,
        isActive: false, // still inactive until OTP verified
      });

      if (!updatedUser) {
        return ResponseService.fail('Failed to update user with OTP');
      }

      // Send OTP email
      // await MailerService.sendMail({
      //   to: user.email,
      //   subject: "Your OTP Code",
      //   text: `Your OTP is: ${otp} (valid for 60 seconds).`,
      // });

      delete updatedUser.password; // hide password

      // return ResponseService.success('OTP resent successfully', updatedUser);
      return ResponseService.success('OTP resent successfully', { otp });

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

      // Generate reset token
      const resetToken = crypto.randomBytes(20).toString('hex');
      const resetExpiry = Date.now() + 60 * 60 * 1000; // 1 hour

      // Save reset token in DB
      await User.updateOne({ id: user.id }).set({
        resetToken,
        resetExpiry,
      });

      // Send reset link via email
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Request',
        html: `<p>Click below link to reset your password (valid for 1 hour):</p>
               <a href="${resetLink}">${resetLink}</a>`,
      });

      return ResponseService.success('Password reset link sent to your email');
    } catch (err) {
      sails.log.error('Forgot Password Error:', err);
      return ResponseService.fail('Something went wrong while requesting password reset');
    }
  },

  /**
   * Reset Password
   */
  resetPassword: async ({ token, newPassword }) => {
    try {
      if (!token) return ResponseService.fail('Reset token is required');
      if (!newPassword) return ResponseService.fail('New password is required');
      if (newPassword.length < 6) return ResponseService.fail('Password must be at least 6 characters');

      const user = await User.findOne({ resetToken: token });
      if (!user) return ResponseService.fail('Invalid or expired reset token');

      if (Date.now() > user.resetExpiry) {
        return ResponseService.fail('Reset token expired');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await User.updateOne({ id: user.id }).set({
        password: hashedPassword,
        resetToken: null,
        resetExpiry: null,
      });

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
