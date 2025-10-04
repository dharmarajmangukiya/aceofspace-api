module.exports = {
  primaryKey: 'id',
  schema: true,

  attributes: {
    id: { type: 'string', columnName: '_id' }, // MongoDB ObjectId as string

    userId: {
      model: 'user', // relation with User
      required: true
    },

    documentType: {
      type: 'string',
      required: true,
      isIn: ['aadhar', 'pan', 'passport', 'driving_license']
    },

    documentNumber: {
      type: 'string',
      required: true,
      maxLength: 50
    },

    documentFile: {
      type: 'string',
      required: true,
      description: 'Relative file path of the uploaded KYC document'
    },

    status: {
      type: 'string',
      isIn: ['pending', 'approved', 'rejected'],
      defaultsTo: 'pending'
    },

    remark: {
      type: 'string',
      allowNull: true,
      description: 'Admin remarks on KYC approval/rejection'
    },

    createdAt: { type: 'ref', columnType: 'datetime', autoCreatedAt: true },
    updatedAt: { type: 'ref', columnType: 'datetime', autoUpdatedAt: true },
  },
};
