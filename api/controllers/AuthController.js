
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
};
