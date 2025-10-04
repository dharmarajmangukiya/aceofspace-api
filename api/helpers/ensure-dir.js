const fs = require('fs');

module.exports = {
  friendlyName: 'Ensure directory exists',

  description: 'Create directory if not exists (sync)',

  inputs: {
    dir: { type: 'string', required: true }
  },

  fn: function (inputs) {
    if (!fs.existsSync(inputs.dir)) {
      fs.mkdirSync(inputs.dir, { recursive: true });
    }
  }
};
