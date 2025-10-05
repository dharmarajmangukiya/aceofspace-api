const path = require('path');
const fs = require('fs');

module.exports = {
  // Add property
  add: async (req, res) => {
    try {
      const { title, description, type, price, location, images } = req.body;
      const owner = req.user.id;

      if (!title || !type || !price || !location) {
        return res.json(ResponseService.fail('All required fields must be provided.'));
      }

      if (!['residential', 'commercial'].includes(type)) {
        return res.json(ResponseService.fail('Invalid property type.'));
      }

      const property = await Property.create({
        title,
        description,
        type,
        price,
        location,
        images,
        owner,
      }).fetch();

      return res.json(ResponseService.success('Property added successfully.', property));
    } catch (error) {
      sails.log.error('Property Add Error:', error);
      return res.json(ResponseService.fail('Unable to add property.'));
    }
  },

  uploadImage: async function (req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.json(ResponseService.fail('Unauthorized: user not found from token.'));
      }

      // Ensure upload directory exists
      const uploadPath = path.resolve(sails.config.appPath, 'assets/uploads/properties');
      await sails.helpers.ensureDir(uploadPath);

      // Handle upload
      await new Promise((resolve, reject) => {
        req.file('image').upload(
          {
            dirname: uploadPath,
            maxBytes: 5 * 1024 * 1024, // 5MB max
          },
          async (err, uploadedFiles) => {
            if (err) return reject(err);
            if (uploadedFiles.length === 0) {
              return reject(new Error('Please upload at least one image.'));
            }

            const uploadedFile = uploadedFiles[0];
            const ext = path.extname(uploadedFile.filename).toLowerCase();
            const allowedExtensions = ['.jpg', '.jpeg', '.png'];

            // Validate extension
            if (!allowedExtensions.includes(ext)) {
              fs.unlinkSync(uploadedFile.fd);
              return reject(new Error('Invalid file type. Only JPG, JPEG, PNG allowed.'));
            }

            // Create unique file name
            const uniqueFileName = `property_${userId}_${Date.now()}${ext}`;
            const finalPath = path.join(uploadPath, uniqueFileName);
            fs.renameSync(uploadedFile.fd, finalPath);

            // Relative and full paths
            const relativePath = `/uploads/properties/${uniqueFileName}`;
            const baseUrl = sails.config.custom.baseUrl || `${req.protocol}://${req.headers.host}`;
            const fullFilePath = `${baseUrl}${relativePath}`;

            // Save only relative path in DB
            const imageRecord = await PropertyImage.create({
              userId,
              imagePath: relativePath,
            }).fetch();

            // Return full URL in response
            return resolve({
              id: imageRecord.id,
              relativePath,
              fullPath: fullFilePath,
            });
          }
        );
      })
        .then((imageData) => {
          return res.json(
            ResponseService.success('Image uploaded successfully.', imageData)
          );
        })
        .catch((err) => {
          return res.json(ResponseService.fail(err.message));
        });
    } catch (error) {
      sails.log.error('Property Upload Error:', error);
      return res.json(ResponseService.fail('Server error: ' + error.message));
    }
  },

  // My properties
  myProperties: async (req, res) => {
    try {
      const userId = req.user.id;
      const properties = await Property.find({ owner: userId }).sort('createdAt DESC');

      return res.json(ResponseService.success('My properties fetched successfully.', properties));
    } catch (error) {
      sails.log.error('My Properties Error:', error);
      return res.json(ResponseService.fail('Unable to fetch properties.'));
    }
  },

  // Property list (with filters)
  list: async (req, res) => {
    try {
      const { type, location, minPrice, maxPrice, status } = req.query;
      const criteria = {};

      if (type) criteria.type = type;
      if (status) criteria.status = status;
      if (location) criteria.location = { contains: location };
      if (minPrice || maxPrice) {
        criteria.price = {};
        if (minPrice) criteria.price['>='] = parseFloat(minPrice);
        if (maxPrice) criteria.price['<='] = parseFloat(maxPrice);
      }

      const properties = await Property.find(criteria)
        .sort('createdAt DESC')
        .populate('owner', { select: ['firstName', 'lastName', 'email'] });

      return res.json(ResponseService.success('Property list fetched successfully.', properties));
    } catch (error) {
      sails.log.error('Property List Error:', error);
      return res.json(ResponseService.fail('Unable to fetch property list.'));
    }
  },

  // Property detail
  detail: async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.json(ResponseService.fail('Property ID required.'));

      const property = await Property.findOne({ id }).populate('owner', {
        select: ['firstName', 'lastName', 'email'],
      });

      if (!property) return res.json(ResponseService.fail('Property not found.'));

      return res.json(ResponseService.success('Property details fetched successfully.', property));
    } catch (error) {
      sails.log.error('Property Detail Error:', error);
      return res.json(ResponseService.fail('Unable to fetch property details.'));
    }
  },
};
