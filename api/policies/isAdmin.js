module.exports = async function (req, res, proceed) {
  if (!req.user || req.user.role !== 'admin') {
    return res.forbidden({ error: 'Admin access required' });
  }
  return proceed();
};
