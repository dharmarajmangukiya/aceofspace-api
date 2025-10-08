/**
 * FavoriteController
 * Handles Add / Remove / List Favorite Properties for logged-in users
 */

module.exports = {

  // Add property to favorites
  add: async function (req, res) {
    try {
      const userId = req.user?.id;
      const { propertyId } = req.body;

      if (!userId) return res.json(ResponseService.fail('Unauthorized user.'));
      if (!propertyId) return res.json(ResponseService.fail('Property ID is required.'));

      const property = await Property.findOne({ id: propertyId });
      if (!property) return res.json(ResponseService.fail('Property not found.'));

      const favorite = await Favorite.create({
        user: userId,
        property: propertyId,
      }).fetch();

      return res.json(ResponseService.success('Property added to favorites.', favorite));
    } catch (err) {
      if (err.code === 'E_ALREADY_EXISTS') {
        return res.json(ResponseService.fail('Property already in favorites.'));
      }
      sails.log.error('Add Favorite Error:', err);
      return res.json(ResponseService.fail('Server error: ' + err.message));
    }
  },

  // Remove property from favorites
  remove: async function (req, res) {
    try {
      const userId = req.user?.id;
      const { propertyId } = req.body;

      if (!userId) return res.json(ResponseService.fail('Unauthorized user.'));
      if (!propertyId) return res.json(ResponseService.fail('Property ID is required.'));

      const favorite = await Favorite.findOne({
        user: userId,
        property: propertyId,
      });
      if (!favorite) return res.json(ResponseService.fail('Property not found in favorites.'));

      await Favorite.destroyOne({ id: favorite.id });

      return res.json(ResponseService.success('Property removed from favorites.'));
    } catch (err) {
      sails.log.error('Remove Favorite Error:', err);
      return res.json(ResponseService.fail('Server error: ' + err.message));
    }
  },

  // List favorite properties (Paginated)
  list: async function (req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.json(ResponseService.fail('Unauthorized user.'));

      const page = parseInt(req.query.page || 1);
      const limit = parseInt(req.query.limit || 10);
      const skip = (page - 1) * limit;

      const favorites = await Favorite.find({ user: userId })
        .populate('property')
        .sort('createdAt DESC')
        .skip(skip)
        .limit(limit);

      const total = await Favorite.count({ user: userId });

      return res.json(ResponseService.success('Favorite properties fetched successfully.', {
        page,
        total,
        totalPages: Math.ceil(total / limit),
        favorites,
      }));
    } catch (err) {
      sails.log.error('List Favorites Error:', err);
      return res.json(ResponseService.fail('Server error: ' + err.message));
    }
  },
};
