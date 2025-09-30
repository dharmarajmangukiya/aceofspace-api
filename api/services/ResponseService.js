module.exports = {

  success: (message, data = null) => {
    return {
      status: 1,
      message,
      data
    };
  },

  fail: (message, data = null) => {
    return {
      status: 0,
      message,
      data
    };
  },

  sessionExpired: (message = 'Session expired') => {
    return {
      status: 2,
      message,
      data: null
    };
  }

};
