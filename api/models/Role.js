module.exports = {
  primaryKey: 'id',

  attributes: {
    id: { type: 'string', columnName: '_id' },

    name: { type: 'string', required: true, unique: true },
    description: { type: 'string' },

    users: { collection: 'user', via: 'role' }
  }
};
