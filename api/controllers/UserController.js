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

      // ----------------- Validation -----------------
      if (!oldPassword || !newPassword) {
        return res.json(ResponseService.fail('Old and new password are required'));
      }

      if (newPassword.length < 6) {
        return res.json(ResponseService.fail('New password must be at least 6 characters'));
      }

      // ----------------- Get user -----------------
      const user = req.user; // password still exists here from isAuthenticated policy
      if (!user) {
        return res.json(ResponseService.fail('User not found'));
      }

      // ----------------- Verify old password -----------------
      const valid = await bcrypt.compare(oldPassword, user.password);
      if (!valid) return res.json(ResponseService.fail('Old password is incorrect'));

      // ----------------- Hash new password -----------------
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // ----------------- Update user -----------------
      const updatedUser = await User.updateOne({ id: user.id }).set({
        password: hashedPassword,
        updatedAt: new Date()
      });

      if (!updatedUser) {
        return res.json(ResponseService.fail('Failed to update password'));
      }

      // ----------------- Return safe response -----------------
      const safeUser = { ...updatedUser };
      delete safeUser.password;

      return res.json(ResponseService.success('Password changed successfully', safeUser));

    }
    // catch (err) {
    //   sails.log.error('Change password error:', err);
    //   return res.json(ResponseService.fail('Something went wrong while changing password'));
    // }


    catch (err) {
      sails.log.error('Change password error:', err);
      return res.json(ResponseService.fail(err.message || 'Something went wrong while changing password'));
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
