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

      // // Handle media uploads (images + optional video)
      // const uploadDir = path.resolve(sails.config.appPath, 'assets/uploads/property');
      // if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      // // Upload images
      // await new Promise((resolve, reject) => {
      //   req.file('images').upload(
      //     {
      //       dirname: uploadDir,
      //       maxBytes: 10 * 1024 * 1024,
      //       saveAs: (file, cb) => cb(null, Date.now() + '-' + file.filename),
      //     },
      //     async (err, uploadedFiles) => {
      //       if (err) return reject(err);
      //       if (uploadedFiles.length > 10)
      //         return reject(new Error('Maximum 10 images allowed.'));

      //       const imagePaths = uploadedFiles.map(
      //         (f) => '/uploads/property/' + path.basename(f.fd)
      //       );
      //       await Property.updateOne({ id: property.id }).set({ images: imagePaths });
      //       resolve();
      //     }
      //   );
      // });

      // // Upload video (optional)
      // await new Promise((resolve, reject) => {
      //   req.file('video').upload(
      //     {
      //       dirname: uploadDir,
      //       maxBytes: 400 * 1024 * 1024,
      //       saveAs: (file, cb) => cb(null, Date.now() + '-' + file.filename),
      //     },
      //     async (err, uploadedFiles) => {
      //       if (err) return reject(err);
      //       if (!uploadedFiles.length) return resolve();

      //       const videoFile = uploadedFiles[0];
      //       const ext = path.extname(videoFile.filename).toLowerCase();
      //       if (ext !== '.mp4') return reject(new Error('Only MP4 video allowed.'));

      //       const videoPath = '/uploads/property/' + path.basename(videoFile.fd);
      //       await Property.updateOne({ id: property.id }).set({ video: videoPath });
      //       resolve();
      //     }
      //   );
      // });

      const savedProperty = await Property.findOne({ id: property.id });
      return res.json(ResponseService.success('Property added successfully.', savedProperty));
    } catch (err) {
      sails.log.error('Add Property Error:', err);
      return res.json(ResponseService.fail('Server error: ' + err.message));
    }
  },

  // add: async function (req, res) {
  //   try {
  //     const userId = req.user?.id;
  //     if (!userId) return res.json(ResponseService.fail('Unauthorized user.'));

  //     const data = req.body;
  //     console.log(data);

  //     // -------------------------
  //     // Step 1: Basic validations
  //     // -------------------------
  //     const required = ['propertyType', 'address', 'city', 'state', 'pincode','subType'];
  //     for (let f of required) {
  //       if (!data[f]) return res.json(ResponseService.fail(`${f} is required.`));
  //     }

  //     // Validate property type
  //     if (!['residential', 'commercial'].includes(data.propertyType)) {
  //       return res.json(ResponseService.fail('Invalid property type.'));
  //     }

  //     // -------------------------
  //     // Step 2: Create property record
  //     // -------------------------
  //     const property = await Property.create({
  //       ...data,
  //       owner: userId,
  //       status: 'pending', // Admin must approve before listing
  //     }).fetch();

  //     // -------------------------
  //     // Step 3: Handle media upload (images + video)
  //     // -------------------------
  //     const uploadDir = path.resolve(sails.config.appPath, 'assets/uploads/property');

  //     if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  //     const imagePaths = [];
  //     let videoPath = null;

  //     // ---- Upload Images ----
  //     await new Promise((resolve, reject) => {
  //       req.file('media').upload(
  //         {
  //           dirname: uploadDir,
  //           maxBytes: 400 * 1024 * 1024, // max allowed per file
  //           saveAs: (file, cb) => {
  //             const fileName = Date.now() + '-' + file.filename;
  //             cb(null, fileName);
  //           },
  //         },
  //         (err, uploadedFiles) => {
  //           if (err) return reject(err);

  //           if (!uploadedFiles.length) return resolve();

  //           // Separate image/video files
  //           const imageFiles = uploadedFiles.filter(f =>
  //             ['.jpg', '.jpeg', '.png'].includes(path.extname(f.filename).toLowerCase())
  //           );
  //           const videoFiles = uploadedFiles.filter(f =>
  //             path.extname(f.filename).toLowerCase() === '.mp4'
  //           );

  //           // Validate counts
  //           if (imageFiles.length > 10) return reject(new Error('Maximum 10 images allowed.'));
  //           if (videoFiles.length > 1) return reject(new Error('Only one video file allowed.'));

  //           // Validate image extensions
  //           for (let img of imageFiles) {
  //             const ext = path.extname(img.filename).toLowerCase();
  //             if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
  //               return reject(new Error('Invalid image format. Only JPG, PNG allowed.'));
  //             }
  //           }

  //           // Validate video file if exists
  //           if (videoFiles.length) {
  //             const video = videoFiles[0];
  //             const ext = path.extname(video.filename).toLowerCase();
  //             if (ext !== '.mp4') return reject(new Error('Only MP4 videos are allowed.'));
  //             if (video.size > 400 * 1024 * 1024)
  //               return reject(new Error('Video must be ≤ 400MB.'));

  //             videoPath = '/uploads/property/' + path.basename(video.fd);
  //           }

  //           // Process images
  //           imagePaths.push(
  //             ...imageFiles.map(f => '/uploads/property/' + path.basename(f.fd))
  //           );

  //           resolve();
  //         }
  //       );
  //     });

  //     // -------------------------
  //     // Step 4: Update property record with media
  //     // -------------------------
  //     if (imagePaths.length || videoPath) {
  //       await Property.updateOne({ id: property.id }).set({
  //         images: imagePaths,
  //         video: videoPath,
  //       });
  //     }

  //     // -------------------------
  //     // Step 5: Success response
  //     // -------------------------
  //     const finalProperty = await Property.findOne({ id: property.id });
  //     return res.json(
  //       ResponseService.success(
  //         'Property added successfully. Awaiting admin approval.',
  //         finalProperty
  //       )
  //     );
  //   } catch (err) {
  //     sails.log.error('Add Property Error:', err);
  //     return res.json(ResponseService.fail('Error adding property: ' + err.message));
  //   }
  // },


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
      const id = req.params.id;

      const property = await Property.findOne({ id });
      if (!property) return res.json(ResponseService.fail('Property not found.'));
      if (property.owner !== userId) return res.json(ResponseService.fail('Not authorized to update.'));

      const updated = await Property.updateOne({ id }).set(req.body);
      return res.json(ResponseService.success('Property updated successfully.', updated));
    } catch (err) {
      sails.log.error('Property Update Error:', err);
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




// const path = require('path');
// const fs = require('fs');

// module.exports = {
//   // Add property
//   add: async (req, res) => {
//     try {
//       const { title, description, type, price, location, images } = req.body;
//       const owner = req.user.id;

//       if (!title || !type || !price || !location) {
//         return res.json(ResponseService.fail('All required fields must be provided.'));
//       }

//       if (!['residential', 'commercial'].includes(type)) {
//         return res.json(ResponseService.fail('Invalid property type.'));
//       }

//       const property = await Property.create({
//         title,
//         description,
//         type,
//         price,
//         location,
//         images,
//         owner,
//       }).fetch();

//       return res.json(ResponseService.success('Property added successfully.', property));
//     } catch (error) {
//       sails.log.error('Property Add Error:', error);
//       return res.json(ResponseService.fail('Unable to add property.'));
//     }
//   },

//   uploadImage: async function (req, res) {
//     try {
//       const userId = req.user?.id;
//       if (!userId) {
//         return res.json(ResponseService.fail('Unauthorized: user not found from token.'));
//       }

//       // Ensure upload directory exists
//       const uploadPath = path.resolve(sails.config.appPath, 'assets/uploads/properties');
//       await sails.helpers.ensureDir(uploadPath);

//       // Handle upload
//       await new Promise((resolve, reject) => {
//         req.file('image').upload(
//           {
//             dirname: uploadPath,
//             maxBytes: 5 * 1024 * 1024, // 5MB max
//           },
//           async (err, uploadedFiles) => {
//             if (err) return reject(err);
//             if (uploadedFiles.length === 0) {
//               return reject(new Error('Please upload at least one image.'));
//             }

//             const uploadedFile = uploadedFiles[0];
//             const ext = path.extname(uploadedFile.filename).toLowerCase();
//             const allowedExtensions = ['.jpg', '.jpeg', '.png'];

//             // Validate extension
//             if (!allowedExtensions.includes(ext)) {
//               fs.unlinkSync(uploadedFile.fd);
//               return reject(new Error('Invalid file type. Only JPG, JPEG, PNG allowed.'));
//             }

//             // Create unique file name
//             const uniqueFileName = `property_${userId}_${Date.now()}${ext}`;
//             const finalPath = path.join(uploadPath, uniqueFileName);
//             fs.renameSync(uploadedFile.fd, finalPath);

//             // Relative and full paths
//             const relativePath = `/uploads/properties/${uniqueFileName}`;
//             const baseUrl = sails.config.custom.baseUrl || `${req.protocol}://${req.headers.host}`;
//             const fullFilePath = `${baseUrl}${relativePath}`;

//             // Save only relative path in DB
//             const imageRecord = await PropertyImage.create({
//               userId,
//               imagePath: relativePath,
//             }).fetch();

//             // Return full URL in response
//             return resolve({
//               id: imageRecord.id,
//               relativePath,
//               fullPath: fullFilePath,
//             });
//           }
//         );
//       })
//         .then((imageData) => {
//           return res.json(
//             ResponseService.success('Image uploaded successfully.', imageData)
//           );
//         })
//         .catch((err) => {
//           return res.json(ResponseService.fail(err.message));
//         });
//     } catch (error) {
//       sails.log.error('Property Upload Error:', error);
//       return res.json(ResponseService.fail('Server error: ' + error.message));
//     }
//   },

//   // My properties
//   myProperties: async (req, res) => {
//     try {
//       const userId = req.user.id;
//       const properties = await Property.find({ owner: userId }).sort('createdAt DESC');

//       return res.json(ResponseService.success('My properties fetched successfully.', properties));
//     } catch (error) {
//       sails.log.error('My Properties Error:', error);
//       return res.json(ResponseService.fail('Unable to fetch properties.'));
//     }
//   },

//   // Property list (with filters)
//   list: async (req, res) => {
//     try {
//       const { type, location, minPrice, maxPrice, status } = req.query;
//       const criteria = {};

//       if (type) criteria.type = type;
//       if (status) criteria.status = status;
//       if (location) criteria.location = { contains: location };
//       if (minPrice || maxPrice) {
//         criteria.price = {};
//         if (minPrice) criteria.price['>='] = parseFloat(minPrice);
//         if (maxPrice) criteria.price['<='] = parseFloat(maxPrice);
//       }

//       const properties = await Property.find(criteria)
//         .sort('createdAt DESC')
//         .populate('owner', { select: ['firstName', 'lastName', 'email'] });

//       return res.json(ResponseService.success('Property list fetched successfully.', properties));
//     } catch (error) {
//       sails.log.error('Property List Error:', error);
//       return res.json(ResponseService.fail('Unable to fetch property list.'));
//     }
//   },

//   // Property detail
//   detail: async (req, res) => {
//     try {
//       const { id } = req.params;
//       if (!id) return res.json(ResponseService.fail('Property ID required.'));

//       const property = await Property.findOne({ id }).populate('owner', {
//         select: ['firstName', 'lastName', 'email'],
//       });

//       if (!property) return res.json(ResponseService.fail('Property not found.'));

//       return res.json(ResponseService.success('Property details fetched successfully.', property));
//     } catch (error) {
//       sails.log.error('Property Detail Error:', error);
//       return res.json(ResponseService.fail('Unable to fetch property details.'));
//     }
//   },
// };
