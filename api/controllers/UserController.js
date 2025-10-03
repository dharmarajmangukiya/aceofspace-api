const bcrypt = require('bcryptjs');

module.exports = {

  /**
   * Get logged-in user's profile
   * Token is checked via `isAuthenticated` policy
   */
  profile: async function (req, res) {
    try {
      // req.user is populated by isAuthenticated policy
      const user = req.user;

      return res.json(ResponseService.success(
        'Profile fetched successfully',
        user
      ));
    } catch (err) {
      sails.log.error('Profile fetch error:', err);
      return res.json(ResponseService.fail('Something went wrong while fetching profile'));
    }
  },

  /**
   * Update user profile
   */
  updateProfile: async function (req, res) {
    try {
      const { firstName, lastName, mobile } = req.body;

      // Validate
      if (!firstName || firstName.trim() === '') {
        return res.json(ResponseService.fail('First name is required'));
      }
      if (!lastName || lastName.trim() === '') {
        return res.json(ResponseService.fail('Last name is required'));
      }

      const updatedUser = await User.updateOne({ id: req.user.id }).set({
        firstName,
        lastName,
        mobile,
        updatedAt: new Date()
      });

      if (!updatedUser) return res.json(ResponseService.fail('User not found'));

      delete updatedUser.password;
      return res.json(ResponseService.success('Profile updated successfully', updatedUser));

    } catch (err) {
      sails.log.error('Update profile error:', err);
      return res.json(ResponseService.fail('Something went wrong while updating profile'));
    }
  },

  /**
   * Change password
   */

  changePassword: async function (req, res) {
    try {
      const { oldPassword, newPassword } = req.body;

      // Validation
      if (!oldPassword || !newPassword) {
        return res.json({ status: 0, message: 'Old and new password are required', data: null });
      }

      if (newPassword.length < 6) {
        return res.json({ status: 0, message: 'New password must be at least 6 characters', data: null });
      }

      // Get logged-in user
      const user = await User.findOne({ id: req.user.id });
      if (!user) {
        return res.json({ status: 0, message: 'User not found', data: null });
      }

      // Verify old password
      const valid = await bcrypt.compare(oldPassword, user.password);
      if (!valid) {
        return res.json({ status: 0, message: 'Old password is incorrect', data: null });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user
      await User.updateOne({ id: user.id }).set({ password: hashedPassword });

      return res.json({ status: 1, message: 'Password updated successfully', data: null });

    } catch (err) {
      sails.log.error('Change password error:', err);
      return res.json({ status: 0, message: 'Something went wrong', data: null });
    }
  },



  /**
   * Step 1: Forgot Password - Generate OTP and send to email
   */
  forgotPassword: async function (req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.json(ResponseService.fail('Email is required'));
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.json(ResponseService.fail('User not found'));
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Expiry 10 min
      const expiry = Date.now() + 10 * 60 * 1000;

      await User.updateOne({ id: user.id }).set({
        resetToken: otp,
        resetTokenExpiry: expiry
      });

      // Send OTP via Email (basic nodemailer setup)
      // let transporter = nodemailer.createTransport({
      //   service: 'gmail',
      //   auth: {
      //     user: process.env.SMTP_USER, // your email
      //     pass: process.env.SMTP_PASS  // your app password
      //   }
      // });

      // await transporter.sendMail({
      //   from: `"Support" <${process.env.SMTP_USER}>`,
      //   to: email,
      //   subject: 'Password Reset OTP',
      //   text: `Your OTP is ${otp}. It will expire in 10 minutes.`
      // });

      return res.json(ResponseService.success('OTP sent to your email', { email,otp }));

    } catch (err) {
      sails.log.error('Forgot password error:', err);
      return res.json(ResponseService.fail('Something went wrong'));
    }
  },


  /**
   * Step 2: Reset Password using OTP
   */
  resetPassword: async function (req, res) {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res.json(ResponseService.fail('Email, OTP and new password are required'));
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.json(ResponseService.fail('User not found'));
      }

      if (!user.resetToken || !user.resetTokenExpiry) {
        return res.json(ResponseService.fail('No reset request found'));
      }

      if (user.resetToken !== otp) {
        return res.json(ResponseService.fail('Invalid OTP'));
      }

      if (Date.now() > user.resetTokenExpiry) {
        return res.json(ResponseService.fail('OTP expired, please request again'));
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await User.updateOne({ id: user.id }).set({
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        updatedAt: new Date()
      });

      return res.json(ResponseService.success('Password reset successful'));

    } catch (err) {
      sails.log.error('Reset password error:', err);
      return res.json(ResponseService.fail('Something went wrong'));
    }
  },

  /**
   * Admin: List all users
   * Apply `isAdmin` policy in config/policies.js
   */
  list: async function (req, res) {
    try {
      const users = await User.find().populate('role');
      users.forEach(u => delete u.password);

      return res.json(ResponseService.success('Users fetched successfully', users));

    } catch (err) {
      sails.log.error('List users error:', err);
      return res.json(ResponseService.fail('Something went wrong while fetching users'));
    }
  }

};
