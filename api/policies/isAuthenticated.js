const jwt = require('jsonwebtoken');

module.exports = async function (req, res, proceed) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.json(ResponseService.fail('Authorization header missing'));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.json(ResponseService.fail('Token missing'));
    }

    const jwtSecret = sails.config.custom.jwtSecret || 'mySuperSecretKey123';
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      return res.json(ResponseService.sessionExpired('Session expired, please login again'));
    }

    // decoded payload should contain userId
    const user = await User.findOne({ id: decoded.userId }).populate('role');
    if (!user) {
      return res.json(ResponseService.fail('User not found'));
    }

    delete user.password;
    req.user = user;

    return proceed(); // continue controller
  } catch (err) {
    sails.log.error(err);
    return res.json(ResponseService.fail('Unauthorized access'));
  }
};


