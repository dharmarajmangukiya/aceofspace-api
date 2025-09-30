module.exports = {

  friendlyName: 'Validate Email',

  description: 'Check if email is valid',

  sync: true,

  inputs: {
    email: {
      type: 'string',
      required: true
    }
  },

  exits: {
    success: {
      description: 'Email is valid'
    }
  },

  fn: function (inputs) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(inputs.email);
  }

};
