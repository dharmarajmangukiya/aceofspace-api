const path = require('path');

module.exports = {

  friendlyName: 'Upload file(s)',
  description: 'Reusable helper to upload image(s) or video file.',

  inputs: {
    req: { type: 'ref', required: true },
    field: { type: 'string', required: true }, // 'media' or 'video'
    folder: { type: 'string', defaultsTo: 'uploads/property' },
    multiple: { type: 'boolean', defaultsTo: false },
    allowedTypes: { type: 'ref', defaultsTo: [] }, // mime or ext
    maxBytes: { type: 'number', defaultsTo: 500 * 1024 * 1024 },
  },

  fn: async function (inputs, exits) {
    const { req, field, folder, multiple, allowedTypes, maxBytes } = inputs;
    const uploadedFiles = [];

    await new Promise((resolve, reject) => {
      req.file(field).upload({
        dirname: path.resolve(sails.config.appPath, folder),
        maxBytes,
      }, (err, uploaded) => {
        if (err) {return reject(err);}

        if (!uploaded.length) {return resolve();}

        uploaded.forEach(file => {
          const filename = path.basename(file.fd);
          const ext = path.extname(filename).toLowerCase();

          // Type check
          if (allowedTypes.length && !allowedTypes.includes(ext)) {
            return reject(new Error(`Invalid file type for ${field}: ${ext}`));
          }

          uploadedFiles.push({
            name: filename,
            url: `/uploads/property/${filename}`,
          });
        });

        if (!multiple && uploadedFiles.length > 1) {
          return reject(new Error(`Only one file allowed for ${field}.`));
        }

        resolve();
      });
    });

    return exits.success(uploadedFiles);
  }
};
