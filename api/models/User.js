module.exports = {
  primaryKey: 'id',

  attributes: {
    id: { type: 'string', columnName: '_id' },  //  Mongo ObjectId

    firstName: { type: 'string', required: true },
    lastName: { type: 'string', required: true },
    email: { type: 'string', required: true, unique: true, isEmail: true },
    password: { type: 'string', required: true, protect: true },
    isActive: { type: 'boolean', defaultsTo: false },

    role: { model: 'role' },   // relation
    // properties: { collection: 'property', via: 'owner' }, causing your error
  },

  customToJSON: function () {
    return _.omit(this, ['password']);
  }
};
