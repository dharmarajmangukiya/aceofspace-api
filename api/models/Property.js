module.exports = {
  primaryKey: 'id',
  schema: true,
  attributes: {
    id: { type: 'string', columnName: '_id' }, // Mongo ObjectId

    title: { type: 'string', required: true },
    description: { type: 'string', allowNull: true },
    type: { type: 'string', isIn: ['residential', 'commercial'], required: true },
    price: { type: 'number', required: true },
    location: { type: 'string', required: true },
    status: { type: 'string', isIn: ['available', 'sold'], defaultsTo: 'available' },
    images: { type: 'json', columnType: 'array', defaultsTo: [] },

    owner: { model: 'user', required: true }, // Relation to user

    createdAt: { type: 'ref', columnType: 'datetime', autoCreatedAt: true },
    updatedAt: { type: 'ref', columnType: 'datetime', autoUpdatedAt: true },
  },

  customToJSON: function () {
    // automatically format createdAt/updatedAt as dd-mm-yyyy
    const formatted = this;
    if (this.createdAt) {
      const d = new Date(this.createdAt);
      formatted.createdAt = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getFullYear()}`;
    }
    if (this.updatedAt) {
      const d = new Date(this.updatedAt);
      formatted.updatedAt = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getFullYear()}`;
    }
    return formatted;
  }
};
