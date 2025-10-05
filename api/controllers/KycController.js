/**
 * Handles KYC document upload, listing, and approval/rejection.
 */

const path = require('path');
const fs = require('fs');

module.exports = {

  upload: async function (req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.json(ResponseService.fail('Unauthorized: user not found from token.'));
      }

      const { documentType, documentNumber } = req.body;

      // Validation 1: required fields
      if (!documentType || !documentNumber) {
        return res.json(ResponseService.fail('Document type and document number are required.'));
      }

      // Validation 2: Allowed document types
      const allowedTypes = ['aadhar', 'pan', 'passport', 'driving_license'];
      if (!allowedTypes.includes(documentType)) {
        return res.json(ResponseService.fail('Invalid document type.'));
      }

      // Validation 3: Document number pattern check
      const docValidators = {
        aadhar: /^\d{12}$/,
        pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
        passport: /^[A-Z][0-9]{7}$/,
        driving_license: /^[A-Z0-9]{8,20}$/
      };
      const regex = docValidators[documentType];
      if (!regex.test(documentNumber)) {
        return res.json(ResponseService.fail(`Invalid ${documentType} number format.`));
      }

      // File Upload
      const uploadPath = path.resolve(sails.config.appPath, 'assets/uploads/kyc');
      await sails.helpers.ensureDir(uploadPath);

      const baseUrl = sails.config.custom.baseUrl || 'http://localhost:1337'; // your app base URL

      const kyc = await new Promise((resolve, reject) => {
        req.file('documentFile').upload(
          {
            dirname: uploadPath,
            maxBytes: 5 * 1024 * 1024 // 5MB limit
          },
          async (err, uploadedFiles) => {
            if (err) return reject(err);
            if (uploadedFiles.length === 0) {
              return reject(new Error('Please upload a document file.'));
            }

            const uploadedFile = uploadedFiles[0];
            const ext = path.extname(uploadedFile.filename).toLowerCase();
            const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

            if (!allowedExtensions.includes(ext)) {
              fs.unlinkSync(uploadedFile.fd);
              return reject(new Error('Invalid file type. Only JPG, PNG, and PDF allowed.'));
            }

            const uniqueFileName = `${documentType}_${userId}_${Date.now()}${ext}`;
            const finalPath = path.join(uploadPath, uniqueFileName);
            fs.renameSync(uploadedFile.fd, finalPath);

            const relativePath = `/uploads/kyc/${uniqueFileName}`;
            // const fullFilePath = `${baseUrl}${relativePath}`; // full URL

            const kycRecord = await Kyc.create({
              userId,
              documentType,
              documentNumber,
              documentFile: relativePath, // store full URL
              status: 'pending'
            }).fetch();

            return resolve(kycRecord);
          }
        );
      });

      return res.json(ResponseService.success(
        'KYC document uploaded successfully. Pending admin approval.',
        kyc
      ));

    } catch (error) {
      sails.log.error(error);
      return res.json(ResponseService.fail('Server error: ' + error.message));
    }
  },


  // upload: async function (req, res) {
  //   try {
  //     // User from verified JWT middleware
  //     const userId = req.user?.id;
  //     if (!userId) {
  //       return res.json(ResponseService.fail('Unauthorized: user not found from token.'));
  //     }

  //     const { documentType, documentNumber } = req.body;

  //     // Validation 1: required fields
  //     if (!documentType || !documentNumber) {
  //       return res.json(ResponseService.fail('Document type and document number are required.'));
  //     }

  //     // Validation 2: Allowed document types
  //     const allowedTypes = ['aadhar', 'pan', 'passport', 'driving_license'];
  //     if (!allowedTypes.includes(documentType)) {
  //       return res.json(ResponseService.fail('Invalid document type.'));
  //     }

  //     // Validation 3: Document number pattern check
  //     const docValidators = {
  //       aadhar: /^\d{12}$/,
  //       pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  //       passport: /^[A-Z][0-9]{7}$/,
  //       driving_license: /^[A-Z0-9]{8,20}$/
  //     };
  //     const regex = docValidators[documentType];
  //     if (!regex.test(documentNumber)) {
  //       return res.json(ResponseService.fail(`Invalid ${documentType} number format.`));
  //     }

  //     // File Upload (use await-friendly promise wrapper)
  //     const uploadPath = path.resolve(sails.config.appPath, 'assets/uploads/kyc');
  //     await sails.helpers.ensureDir(uploadPath); // helper to make dir if not exist

  //     await new Promise((resolve, reject) => {
  //       req.file('documentFile').upload(
  //         {
  //           dirname: uploadPath,
  //           maxBytes: 5 * 1024 * 1024 // 5MB limit
  //         },
  //         async (err, uploadedFiles) => {
  //           if (err) return reject(err);
  //           if (uploadedFiles.length === 0) {
  //             return reject(new Error('Please upload a document file.'));
  //           }

  //           const uploadedFile = uploadedFiles[0];
  //           const ext = path.extname(uploadedFile.filename).toLowerCase();
  //           const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

  //           if (!allowedExtensions.includes(ext)) {
  //             fs.unlinkSync(uploadedFile.fd); // delete invalid file
  //             return reject(new Error('Invalid file type. Only JPG, PNG, and PDF allowed.'));
  //           }

  //           const uniqueFileName = `${documentType}_${userId}_${Date.now()}${ext}`;
  //           const finalPath = path.join(uploadPath, uniqueFileName);
  //           fs.renameSync(uploadedFile.fd, finalPath);

  //           const filePathForDB = `/uploads/kyc/${uniqueFileName}`;

  //           const kyc = await Kyc.create({
  //             userId,
  //             documentType,
  //             documentNumber,
  //             documentFile: filePathForDB,
  //             status: 'pending'
  //           }).fetch();

  //           return resolve(kyc);
  //         }
  //       );
  //     })
  //       .then((kyc) => {
  //         return res.json(ResponseService.success(
  //           kyc,
  //           'KYC document uploaded successfully. Pending admin approval.'
  //         ));
  //       })
  //       .catch((err) => {
  //         return res.json(ResponseService.fail(err.message));
  //       });
  //   } catch (error) {
  //     sails.log.error(error);
  //     return res.json(ResponseService.fail('Server error: ' + error.message));
  //   }
  // },

  // upload: async function (req, res) {
  //   try {
  //     console.log('REQ USER:', req.user);

  //     const userId = req.user.id; // from JWT token (already implemented)
  //     const { documentType, documentNumber } = req.body;

  //     if (!documentType || !documentNumber) {
  //       return res.badRequest({ message: 'Document type and number are required.' });
  //     }

  //     // Allowed document types
  //     const allowedTypes = ['aadhar', 'pan', 'passport', 'driving_license'];
  //     if (!allowedTypes.includes(documentType)) {
  //       return res.badRequest({ message: 'Invalid document type.' });
  //     }

  //     // Handle file upload
  //     req.file('documentFile').upload(
  //       {
  //         dirname: path.resolve(sails.config.appPath, 'assets/uploads/kyc'),
  //         maxBytes: 5 * 1024 * 1024, // 5MB max
  //       },
  //       async (err, uploadedFiles) => {
  //         if (err) return res.serverError(err);

  //         if (uploadedFiles.length === 0) {
  //           return res.badRequest({ message: 'Please upload a document file.' });
  //         }

  //         const uploadedFile = uploadedFiles[0];
  //         const ext = path.extname(uploadedFile.filename).toLowerCase();
  //         const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

  //         // Validate file type
  //         if (!allowedExtensions.includes(ext)) {
  //           // Delete invalid file
  //           fs.unlinkSync(uploadedFile.fd);
  //           return res.badRequest({
  //             message: 'Invalid file type. Only JPG, PNG, and PDF allowed.',
  //           });
  //         }

  //         const filePath = '/uploads/kyc/' + path.basename(uploadedFile.fd);

  //         // Save KYC record
  //         const kyc = await Kyc.create({
  //           userId,
  //           documentType,
  //           documentNumber,
  //           documentFile: filePath,
  //           status: 'pending',
  //         }).fetch();

  //         return res.ok({
  //           message: 'KYC document uploaded successfully. Pending admin approval.',
  //           data: kyc,
  //         });
  //       }
  //     );
  //   } catch (error) {
  //     return res.serverError({ message: error.message });
  //   }
  // },


  /**
   * GET /api/admin/kyc/pending
   * Admin only – list all pending KYC documents
   */
  listPending: async function (req, res) {

    try {
      const kycs = await Kyc.find({ status: 'pending' }).populate('userId');

      if (!kycs.length) {
        return res.json(ResponseService.success('No pending KYC found.', []));
      }

      return res.json(ResponseService.success('Pending KYC list fetched successfully.', kycs));
    } catch (err) {
      sails.log.error(err);
      return res.json(ResponseService.fail('Server error: ' + err.message));
    }
  },

  // =======================
  // ADMIN: Approve or Reject KYC
  // =======================
  updateStatus: async function (req, res) {
    try {
      const { id } = req.params;
      const { status, remark } = req.body;

      if (!id || !status) {
        return res.json(ResponseService.fail('KYC ID and status are required.'));
      }

      const validStatuses = ['approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.json(ResponseService.fail('Invalid status. Must be approved or rejected.'));
      }

      const kyc = await Kyc.findOne({ id });
      if (!kyc) {
        return res.json(ResponseService.fail('KYC record not found.'));
      }

      const updated = await Kyc.updateOne({ id }).set({
        status,
        remark: remark || null,
        updatedAt: new Date()
      });

      if (!updated) {
        return res.json(ResponseService.fail('Failed to update KYC status.'));
      }

      return res.json(ResponseService.success(
        'KYC status updated successfully.',
        updated
      ));
    } catch (error) {
      sails.log.error(error);
      return res.json(ResponseService.fail('Server error: ' + error.message));
    }
  },

};
