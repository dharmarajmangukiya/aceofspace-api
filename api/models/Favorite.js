/**
 * Favorite.js
 * Model for storing user's favorite properties
 */

module.exports = {
  primaryKey: 'id',
  schema: true,

  attributes: {
    id: { type: 'string', columnName: '_id' }, // Mongo ObjectId

    user: { model: 'user', required: true }, // Logged-in user ID
    property: { model: 'property', required: true }, // Favorite property ID

    createdAt: { type: 'ref', columnType: 'datetime', autoCreatedAt: true },
    updatedAt: { type: 'ref', columnType: 'datetime', autoUpdatedAt: true },
  },

  // Prevent duplicate favorites per user/property
  beforeCreate: async function (valuesToSet, proceed) {
    const exists = await Favorite.findOne({
      user: valuesToSet.user,
      property: valuesToSet.property,
    });
    if (exists) {
      const err = new Error('Property already added to favorites.');
      err.code = 'E_ALREADY_EXISTS';
      return proceed(err);
    }
    return proceed();
  },

  customToJSON: function () {
    const formatted = this;
    if (this.createdAt) {
      const d = new Date(this.createdAt);
      formatted.createdAt = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getFullYear()}`;
    }
    return formatted;
  }
};
