
module.exports = {
  register: async (req, res) => {
    const response = await AuthService.register(req.body);
    return res.json(response);
  },

  verifyOtp: async (req, res) => {
    const response = await AuthService.verifyOtp(req.body);
    return res.json(response);
  },

  login: async (req, res) => {
    const response = await AuthService.login(req.body);
    return res.json(response);
  },
  resendOtp: async (req, res) => {
    const response = await AuthService.resendOtp(req.body);
    return res.json(response);
  },
  forgotPassword: async (req, res) => {
    const response = await AuthService.forgotPassword(req.body);
    return res.json(response);
  },

  resetPassword: async (req, res) => {
    const response = await AuthService.resetPassword(req.body);
    return res.json(response);
  },
};
