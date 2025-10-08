/**
 * PropertyController.js
 * @description Handles all property-related APIs (CRUD + Admin approval)
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  /**
   * @route POST /api/property/add
   * @desc Add new property listing
   */

  add: async function (req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.json(ResponseService.fail('Unauthorized user.'));

      const data = req.body;
      data.propertyType = data.propertyType?.toLowerCase();

      const required = ['propertyType', 'address', 'city', 'state', 'pincode'];
      for (let f of required) {
        if (!data[f]) return res.json(ResponseService.fail(`${f} is required.`));
      }

      // Residential validations
      if (data.propertyType === 'residential') {
        if (!data.subType)
          return res.json(ResponseService.fail('Sub-type is required for residential properties.'));
        if (!data.houseNo || !data.apartmentName)
          return res.json(ResponseService.fail('House No and Apartment Name are required for residential.'));
      }

      // Commercial validations
      if (data.propertyType === 'commercial') {
        const commercialRequired = ['officeNo', 'buildingName', 'zone', 'city', 'state', 'pincode', 'carpetArea'];
        for (let field of commercialRequired) {
          if (!data[field]) return res.json(ResponseService.fail(`${field} is required for commercial property.`));
        }
      }

      // Create base property record
      const property = await Property.create({
        ...data,
        owner: userId,
        status: 'pending',
      }).fetch();

      const uploadDir = path.resolve(sails.config.appPath, 'assets/uploads/property');

      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const imagePaths = [];
      let videoPath = null;

      // ---- Upload Images ----
      await new Promise((resolve, reject) => {
        req.file('media').upload(
          {
            dirname: uploadDir,
            maxBytes: 400 * 1024 * 1024, // max allowed per file
            saveAs: (file, cb) => {
              const fileName = Date.now() + '-' + file.filename;
              cb(null, fileName);
            },
          },
          (err, uploadedFiles) => {
            if (err) return reject(err);

            if (!uploadedFiles.length) return resolve();

            // Separate image/video files
            const imageFiles = uploadedFiles.filter(f =>
              ['.jpg', '.jpeg', '.png'].includes(path.extname(f.filename).toLowerCase())
            );
            const videoFiles = uploadedFiles.filter(f =>
              path.extname(f.filename).toLowerCase() === '.mp4'
            );

            // Validate counts
            if (imageFiles.length > 10) return reject(new Error('Maximum 10 images allowed.'));
            if (videoFiles.length > 1) return reject(new Error('Only one video file allowed.'));

            // Validate image extensions
            for (let img of imageFiles) {
              const ext = path.extname(img.filename).toLowerCase();
              if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
                return reject(new Error('Invalid image format. Only JPG, PNG allowed.'));
              }
            }

            // Validate video file if exists
            if (videoFiles.length) {
              const video = videoFiles[0];
              const ext = path.extname(video.filename).toLowerCase();
              if (ext !== '.mp4') return reject(new Error('Only MP4 videos are allowed.'));
              if (video.size > 400 * 1024 * 1024)
                return reject(new Error('Video must be ≤ 400MB.'));

              videoPath = '/uploads/property/' + path.basename(video.fd);
            }

            // Process images
            imagePaths.push(
              ...imageFiles.map(f => '/uploads/property/' + path.basename(f.fd))
            );

            resolve();
          }
        );
      });

      // -------------------------
      // Step 4: Update property record with media
      // -------------------------
      if (imagePaths.length || videoPath) {
        await Property.updateOne({ id: property.id }).set({
          images: imagePaths,
          video: videoPath,
        });
      }


      const savedProperty = await Property.findOne({ id: property.id });
      return res.json(ResponseService.success('Property added successfully.', savedProperty));
    } catch (err) {
      sails.log.error('Add Property Error:', err);
      return res.json(ResponseService.fail('Server error: ' + err.message));
    }
  },


  /**
   * @route GET /api/property/my
   * @desc Get logged-in user's properties
   */
  myProperties: async function (req, res) {
    try {
      const userId = req.user?.id;
      const list = await Property.find({ owner: userId }).sort('createdAt DESC');
      return res.json(ResponseService.success('My Properties fetched successfully.', list));
    } catch (err) {
      sails.log.error('My Property Fetch Error:', err);
      return res.json(ResponseService.fail('Server error: ' + err.message));
    }
  },

  /**
   * @route GET /api/property/list
   * @desc Get approved property listings (public)
   */
  list: async function (req, res) {
    try {
      const list = await Property.find({ status: 'approved' }).populate('owner').sort('createdAt DESC');
      return res.json(ResponseService.success('Property list fetched successfully.', list));
    } catch (err) {
      sails.log.error('Property List Error:', err);
      return res.json(ResponseService.fail('Server error: ' + err.message));
    }
  },

  /**
   * @route GET /api/property/:id
   * @desc Get property details by ID
   */
  detail: async function (req, res) {
    try {
      const id = req.params.id;
      const property = await Property.findOne({ id }).populate('owner');
      if (!property) return res.json(ResponseService.fail('Property not found.'));
      return res.json(ResponseService.success('Property detail fetched successfully.', property));
    } catch (err) {
      sails.log.error('Property Detail Error:', err);
      return res.json(ResponseService.fail('Server error: ' + err.message));
    }
  },

  /**
   * @route PUT /api/property/update/:id
   * @desc Update property details (owner only)
   */

  update: async function (req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.json(ResponseService.fail('Unauthorized user.'));

      const id = req.params.id;
      const property = await Property.findOne({ id });
      if (!property) return res.json(ResponseService.fail('Property not found.'));
      if (property.owner !== userId) return res.json(ResponseService.fail('Not authorized to update.'));

      const data = req.body;
      const uploadDir = path.resolve(sails.config.appPath, 'assets/uploads/property');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      let updatedData = { ...data };

      // ---------- Handle IMAGES upload ----------
      await new Promise((resolve, reject) => {
        req.file('media').upload(
          {
            dirname: uploadDir,
            maxBytes: 10 * 1024 * 1024, // 10MB per image
            saveAs: (file, cb) => cb(null, Date.now() + '-' + file.filename),
          },
          async (err, uploadedFiles) => {
            if (err) return reject(err);
            if (uploadedFiles.length > 0) {
              if (uploadedFiles.length > 10)
                return reject(new Error('Maximum 10 images allowed.'));

              const invalidFile = uploadedFiles.find((f) => {
                const ext = path.extname(f.filename).toLowerCase();
                return !['.jpg', '.jpeg', '.png'].includes(ext);
              });
              if (invalidFile) return reject(new Error('Invalid image format.'));

              const imagePaths = uploadedFiles.map(
                (f) => '/uploads/property/' + path.basename(f.fd)
              );

              // Merge existing + new images
              updatedData.images = [
                ...(property.images || []),
                ...imagePaths,
              ].slice(0, 10); // Limit to 10 total
            }
            resolve();
          }
        );
      });

      // ---------- Handle VIDEO upload ----------
      await new Promise((resolve, reject) => {
        req.file('video').upload(
          {
            dirname: uploadDir,
            maxBytes: 400 * 1024 * 1024, // 400MB max
            saveAs: (file, cb) => cb(null, Date.now() + '-' + file.filename),
          },
          async (err, uploadedFiles) => {
            if (err) return reject(err);
            if (!uploadedFiles.length) return resolve();

            const videoFile = uploadedFiles[0];
            const ext = path.extname(videoFile.filename).toLowerCase();
            if (ext !== '.mp4') return reject(new Error('Only MP4 video allowed.'));

            const videoPath = '/uploads/property/' + path.basename(videoFile.fd);
            updatedData.video = videoPath;
            resolve();
          }
        );
      });

      // ---------- Update the property ----------
      const updated = await Property.updateOne({ id }).set(updatedData);
      return res.json(ResponseService.success('Property updated successfully.', updated));

    } catch (err) {
      sails.log.error('Property Update Error:', err);
      return res.json(ResponseService.fail('Server error: ' + err.message));
    }
  },

  delete: async function (req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.json(ResponseService.fail('Unauthorized user.'));
      }

      const id = req.params.id;
      if (!id) {
        return res.json(ResponseService.fail('Property ID is required.'));
      }

      // Find the property
      const property = await Property.findOne({ id });
      if (!property) {
        return res.json(ResponseService.fail('Property not found.'));
      }

      // Check ownership
      if (property.owner !== userId) {
        return res.json(ResponseService.fail('You are not authorized to delete this property.'));
      }

      // Delete media and video files (if stored)
      const uploadDir = path.resolve(sails.config.appPath, 'assets/uploads/property');
      if (property.media && Array.isArray(property.media)) {
        for (const img of property.media) {
          const imgPath = path.join(uploadDir, path.basename(img.url));
          if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }
      }

      if (property.video && property.video.url) {
        const videoPath = path.join(uploadDir, path.basename(property.video.url));
        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      }

      // Delete record
      await Property.destroyOne({ id });

      return res.json(ResponseService.success('Property deleted successfully.'));
    } catch (err) {
      sails.log.error('Delete Property Error:', err);
      return res.json(ResponseService.fail('Server error: ' + err.message));
    }
  },


  /**
   * @route PUT /api/admin/property/approve/:id
   * @desc Admin approval for property
   */
  approve: async function (req, res) {
    try {
      const id = req.params.id;
      const property = await Property.updateOne({ id }).set({ status: 'approved' });
      if (!property) return res.json(ResponseService.fail('Property not found.'));
      return res.json(ResponseService.success('Property approved successfully.', property));
    } catch (err) {
      sails.log.error('Property Approval Error:', err);
      return res.json(ResponseService.fail('Server error: ' + err.message));
    }
  },

  /**
   * @route PUT /api/admin/property/reject/:id
   * @desc Admin rejects property
   */
  reject: async function (req, res) {
    try {
      const id = req.params.id;
      const { remark } = req.body;
      const property = await Property.updateOne({ id }).set({ status: 'rejected', remark });
      if (!property) return res.json(ResponseService.fail('Property not found.'));
      return res.json(ResponseService.success('Property rejected successfully.', property));
    } catch (err) {
      sails.log.error('Property Reject Error:', err);
      return res.json(ResponseService.fail('Server error: ' + err.message));
    }
  },
};


