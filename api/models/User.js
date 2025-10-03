module.exports = {
  primaryKey: 'id',
  schema: true,
  attributes: {
    id: { type: 'string', columnName: '_id' },  //  Mongo ObjectId

    firstName: { type: 'string', required: true },
    lastName: { type: 'string', required: true },
    email: { type: 'string', required: true, unique: true, isEmail: true },
    password: { type: 'string', required: true, protect: true },
    isActive: { type: 'boolean', defaultsTo: false },
    resetToken: { type: 'string', allowNull: true },
    resetTokenExpiry: { type: 'number', allowNull: true },


    role: { model: 'role' },   // relation
    // properties: { collection: 'property', via: 'owner' }, causing your error
  },

  customToJSON: function () {
    return _.omit(this, ['password']);
  }
};
