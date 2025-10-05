const nodemailer = require('nodemailer');

module.exports = {
  sendOtp: async function (to, otp) {
    try {
      // Configure transporter using Sails config
      const transporter = nodemailer.createTransport({
        service: sails.config.email.service,
        auth: sails.config.email.auth,
      });

      const mailOptions = {
        from: sails.config.email.from,
        to: to,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
      };

      const info = await transporter.sendMail(mailOptions);
      sails.log.info('Email sent successfully:', info.response);
      return true;
    } catch (err) {
      sails.log.error('Email sending failed:', err.message);
      throw new Error('Error sending email: ' + err.message);
    }
  },

  sendMail: async function (to, subject, htmlContent) {
    const transporter = nodemailer.createTransport(sails.config.email);

    let mailOptions = {
      from: sails.config.email.from,
      to: to,
      subject: subject,
      html: htmlContent
    };

    try {
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      sails.log.error('Error sending email:', error);
      throw new Error('Error sending email: ' + error.message);
    }
  },

};

