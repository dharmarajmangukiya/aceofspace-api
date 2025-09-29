// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');

// module.exports = {

//   /**
//    * Register a new user
//    */
//   register: async ({ firstName, lastName, email, password, role }) => {
//     try {
//       // ---------------- Validations ----------------
//       if (!firstName || firstName.trim() === '') {
//         return ResponseService.fail('Please enter first name');
//       }
//       if (!lastName || lastName.trim() === '') {
//         return ResponseService.fail('Please enter last name');
//       }
//       if (!email || email.trim() === '') {
//         return ResponseService.fail('Please enter email');
//       }
//       if (!sails.helpers.validateEmail(email)) {
//         return ResponseService.fail('Invalid email format');
//       }
//       if (!password || password.length < 6) {
//         return ResponseService.fail('Password must be at least 6 characters');
//       }

//       // ---------------- Check if user exists ----------------
//       const existingUser = await User.findOne({ email });
//       if (existingUser) {
//         return ResponseService.fail('Email already registered');
//       }

//       // ---------------- Hash password ----------------
//       const hashedPassword = await bcrypt.hash(password, 10);

//       // ---------------- Role assignment ----------------
//       let userRole;
//       if (role) {
//         userRole = await Role.findOne({ name: role });
//         if (!userRole) {
//           return ResponseService.fail(`Role "${role}" not found. Please contact admin.`);
//         }
//       } else {
//         // Default to "User" role
//         userRole = await Role.findOne({ name: 'User' });
//         if (!userRole) {
//           return ResponseService.fail('Default role "User" not found. Please contact admin.');
//         }
//       }


//       // ---------------- Create user ----------------
//       const newUser = await User.create({
//         firstName,
//         lastName,
//         email,
//         password: hashedPassword,
//         role: userRole.id
//       }).fetch();

//       delete newUser.password;

//       return ResponseService.success('Registration successful', newUser);

//     } catch (err) {
//       sails.log.error(err);
//       return ResponseService.fail('Something went wrong during registration');
//     }
//   },

//   /**
//    * Login user
//    */
//   login: async ({ email, password }) => {
//     try {
//       // ---------------- Validations ----------------
//       if (!email) return ResponseService.fail('Please enter email');
//       if (!password) return ResponseService.fail('Please enter password');

//       const user = await User.findOne({ email }).populate('role');
//       if (!user) return ResponseService.fail('User not found');

//       const valid = await bcrypt.compare(password, user.password);
//       if (!valid) return ResponseService.fail('Invalid email or password');

//       const jwtSecret = sails.config.custom.jwtSecret;
//       if (!jwtSecret) return ResponseService.fail('JWT secret not configured');

//       // ---------------- Generate token ----------------
//       const token = jwt.sign(
//         { id: user.id, role: user.role ? user.role.name : null },
//         jwtSecret,
//         { expiresIn: '7d' }
//       );

//       delete user.password;

//       return ResponseService.success('Login successful', { token, user });

//     } catch (err) {
//       sails.log.error(err);
//       return ResponseService.fail('Something went wrong during login');
//     }
//   }

// };


const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

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

      delete newUser.password;

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

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return ResponseService.fail('Invalid email or password');

      const jwtSecret = sails.config.custom.jwtSecret;
      if (!jwtSecret) return ResponseService.fail('JWT secret not configured');

      const token = jwt.sign(
        { id: user.id, role: user.role ? user.role.name : null },
        jwtSecret,
        { expiresIn: '7d' }
      );

      delete user.password;

      return ResponseService.success('Login successful', { token, user });
    } catch (err) {
      sails.log.error(err);
      return ResponseService.fail('Something went wrong during login');
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
