module.exports = {
  port: process.env.PORT || 1337,
  models: {
    migrate: 'alter', // auto update schema in dev
  },
  log: {
    level: 'debug',
  },
};
