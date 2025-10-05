module.exports = {
  primaryKey: 'id',
  schema: true,
  attributes: {
    id: { type: 'string', columnName: '_id' },
    userId: { model: 'user', required: true },
    imagePath: { type: 'string', required: true },
    createdAt: { type: 'ref', columnType: 'datetime', autoCreatedAt: true },
  },
};
