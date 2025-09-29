module.exports = {
  primaryKey: 'id',

  attributes: {
    id: { type: 'string', columnName: '_id' },

    title: { type: 'string', required: true },
    price: { type: 'number', required: true },

    owner: { model: 'user' }
  }
};
