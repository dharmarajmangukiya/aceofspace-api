/**
 * Handles KYC document upload, listing, and approval/rejection.
 */

const path = require('path');
const fs = require('fs');

module.exports = {

  upload: async function (req, res) {
    try {
      // User from verified JWT middleware
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

      // File Upload (use await-friendly promise wrapper)
      const uploadPath = path.resolve(sails.config.appPath, 'assets/uploads/kyc');
      await sails.helpers.ensureDir(uploadPath); // helper to make dir if not exist

      await new Promise((resolve, reject) => {
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
              fs.unlinkSync(uploadedFile.fd); // delete invalid file
              return reject(new Error('Invalid file type. Only JPG, PNG, and PDF allowed.'));
            }

            const uniqueFileName = `${documentType}_${userId}_${Date.now()}${ext}`;
            const finalPath = path.join(uploadPath, uniqueFileName);
            fs.renameSync(uploadedFile.fd, finalPath);

            const filePathForDB = `/uploads/kyc/${uniqueFileName}`;

            const kyc = await Kyc.create({
              userId,
              documentType,
              documentNumber,
              documentFile: filePathForDB,
              status: 'pending'
            }).fetch();

            return resolve(kyc);
          }
        );
      })
        .then((kyc) => {
          return res.json(ResponseService.success(
            kyc,
            'KYC document uploaded successfully. Pending admin approval.'
          ));
        })
        .catch((err) => {
          return res.json(ResponseService.fail(err.message));
        });
    } catch (error) {
      sails.log.error(error);
      return res.json(ResponseService.fail('Server error: ' + error.message));
    }
  },

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

  // =======================
  // ADMIN: List All Pending KYCs
  // =======================
  listPending: async function (req, res) {
    try {
      const kycs = await Kyc.find({ status: 'pending' }).populate('userId');
      return res.ok({ total: kycs.length, data: kycs });
    } catch (error) {
      return res.serverError({ message: error.message });
    }
  },

  // =======================
  // ADMIN: Approve or Reject KYC
  // =======================
  updateStatus: async function (req, res) {
    try {
      const { kycId, status, remark } = req.body;

      if (!kycId || !status) {
        return res.badRequest({ message: 'KYC ID and status are required.' });
      }

      if (!['approved', 'rejected'].includes(status)) {
        return res.badRequest({ message: 'Invalid status. Must be approved or rejected.' });
      }

      const updated = await Kyc.updateOne({ id: kycId }).set({
        status,
        remark: remark || '',
      });

      if (!updated) {
        return res.notFound({ message: 'KYC record not found.' });
      }

      return res.ok({
        message: `KYC ${status} successfully.`,
        data: updated,
      });
    } catch (error) {
      return res.serverError({ message: error.message });
    }
  },
};
