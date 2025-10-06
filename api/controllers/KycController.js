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

      // -----------------------------
      // Required fields
      // -----------------------------
      if (!documentType || !documentNumber) {
        return res.json(ResponseService.fail('Document type and document number are required.'));
      }

      // -----------------------------
      // Allowed document types
      // -----------------------------
      const allowedTypes = ['aadhar', 'pan', 'passport', 'driving_license'];
      if (!allowedTypes.includes(documentType)) {
        return res.json(ResponseService.fail('Invalid document type.'));
      }

      // -----------------------------
      // Document number pattern check
      // -----------------------------
      const docValidators = {
        aadhar: /^\d{12}$/,
        pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
        passport: /^[A-Z][0-9]{7}$/,
        driving_license: /^[A-Z0-9]{8,20}$/,
      };
      const regex = docValidators[documentType];
      const docNum = documentNumber.toUpperCase();
      if (!regex.test(docNum)) {
        return res.json(ResponseService.fail(`Invalid ${documentType} number format.`));
      }

      // -----------------------------
      // Check if user already uploaded any document
      // -----------------------------
      const existingKyc = await Kyc.find({ userId }).sort('createdAt DESC');

      if (existingKyc.length > 0) {
        const latest = existingKyc[0];
        if (latest.status === 'approved' || latest.status === 'pending') {
          return res.json(
            ResponseService.fail(
              `You already have a ${latest.documentType} document in '${latest.status}' status. Please wait for admin review.`
            )
          );
        }
      }

      // -----------------------------
      // Upload directory setup
      // -----------------------------
      const uploadPath = path.resolve(sails.config.appPath, 'assets/uploads/kyc');
      await sails.helpers.ensureDir(uploadPath);

      // const baseUrl = sails.config.custom.baseUrl || 'http://localhost:1337';

      // -----------------------------
      // Upload files (1 or 2 depending on type)
      // -----------------------------
      const uploadedFiles = await new Promise((resolve, reject) => {
        req.file('documentFile').upload(
          {
            dirname: uploadPath,
            maxBytes: 5 * 1024 * 1024, // 5MB per file
          },
          (err, files) => {
            if (err) return reject(err);
            if (files.length === 0) return reject(new Error('Please upload a document file.'));
            resolve(files);
          }
        );
      });

      // -----------------------------
      // File count check
      // -----------------------------
      if (documentType === 'aadhar' && uploadedFiles.length !== 2) {
        uploadedFiles.forEach(f => fs.unlinkSync(f.fd));
        return res.json(ResponseService.fail('Please upload both front and back images for Aadhar card.'));
      }

      if (['pan', 'passport', 'driving_license'].includes(documentType) && uploadedFiles.length !== 1) {
        uploadedFiles.forEach(f => fs.unlinkSync(f.fd));
        return res.json(ResponseService.fail(`Only one file required for ${documentType}.`));
      }

      // -----------------------------
      // File validation and rename
      // -----------------------------
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
      const uploadedPaths = [];

      for (const file of uploadedFiles) {
        const ext = path.extname(file.filename).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          fs.unlinkSync(file.fd);
          return res.json(ResponseService.fail('Invalid file type. Only JPG, PNG, and PDF allowed.'));
        }

        const uniqueFileName = `${documentType}_${userId}_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2)}${ext}`;
        const finalPath = path.join(uploadPath, uniqueFileName);
        fs.renameSync(file.fd, finalPath);

        uploadedPaths.push(`/uploads/kyc/${uniqueFileName}`);
      }

      // -----------------------------
      // Save record to DB
      // -----------------------------
      const kycRecord = await Kyc.create({
        userId,
        documentType,
        documentNumber: docNum,
        documentFile: documentType === 'aadhar' ? JSON.stringify(uploadedPaths) : uploadedPaths[0],
        status: 'pending',
      }).fetch();

      // -----------------------------
      // Response
      // -----------------------------
      return res.json(
        ResponseService.success('KYC document uploaded successfully. Pending admin approval.', kycRecord)
      );
    } catch (error) {
      sails.log.error('KYC Upload Error:', error);
      return res.json(ResponseService.fail('Server error: ' + error.message));
    }
  },



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
